import { prisma } from "../database/prisma";
import { SubscriptionStatus, BillingInterval } from "@sms/shared";
import { BusinessRuleError, NotFoundError } from "../utils/errors";
import { SequenceService } from "./sequence.service";
import { getProductWithVariant, getActivePlanWithPrice } from "./contracts";
import { calculateBillingPeriod } from "./billing-period";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";

export interface CreateSubscriptionItemInput {
  productId: string;
  productVariantId?: string | null;
  quantity?: string | number;
  unitPriceMinor?: string | number | bigint;
}

export interface CreateSubscriptionInput {
  customerId: string;
  planId?: string | null;
  planPriceId?: string | null;
  billingInterval?: BillingInterval;
  intervalCount?: number;
  currency?: string;
  startDate?: Date | string;
  items?: CreateSubscriptionItemInput[];
}

export class SubscriptionService {
  /**
   * Manually create a subscription with custom or plan-based items.
   */
  static async createSubscription(data: CreateSubscriptionInput, actorUserId?: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer || !customer.isActive) {
      throw new NotFoundError(`Customer with ID '${data.customerId}' not found or inactive`);
    }

    let interval = data.billingInterval || BillingInterval.MONTHLY;
    let intervalCount = data.intervalCount || 1;
    let currency = data.currency || customer.currency || "INR";
    const resolvedItems: Array<{
      productId: string;
      productVariantId?: string | null;
      quantity: string;
      unitPriceMinor: bigint;
    }> = [];

    // If planId and planPriceId provided, inherit from plan
    if (data.planId && data.planPriceId) {
      const { plan, price } = await getActivePlanWithPrice(data.planId, data.planPriceId);
      interval = price.billingInterval as unknown as BillingInterval;
      intervalCount = price.intervalCount;
      currency = price.currency;

      if (!data.items || data.items.length === 0) {
        // Use plan's included items
        for (const item of plan.items) {
          const { finalPriceMinor } = await getProductWithVariant(
            item.productId,
            item.productVariantId || undefined
          );
          resolvedItems.push({
            productId: item.productId,
            productVariantId: item.productVariantId,
            quantity: item.quantity.toString(),
            unitPriceMinor: BigInt(finalPriceMinor),
          });
        }
      }
    }

    // Process explicit line items
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const { product, variant, finalPriceMinor } = await getProductWithVariant(
          item.productId,
          item.productVariantId || undefined
        );

        const unitPriceMinor = item.unitPriceMinor !== undefined
          ? BigInt(item.unitPriceMinor)
          : BigInt(finalPriceMinor);

        resolvedItems.push({
          productId: product.id,
          productVariantId: variant?.id || null,
          quantity: item.quantity !== undefined ? String(item.quantity) : "1.000",
          unitPriceMinor,
        });
      }
    }

    if (resolvedItems.length === 0) {
      throw new BusinessRuleError("A subscription must include at least one product line item");
    }

    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const { periodStart, periodEnd } = calculateBillingPeriod(startDate, interval, intervalCount);

    const subscriptionNumber = await SequenceService.getNextNumber("SUB");

    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNumber,
        customerId: data.customerId,
        planId: data.planId || null,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: interval,
        intervalCount,
        currency,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
        items: {
          create: resolvedItems.map((item) => ({
            productId: item.productId,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            unitPriceMinor: item.unitPriceMinor,
          })),
        },
      },
      include: {
        customer: true,
        plan: true,
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
      },
    });

    await createAuditLog({
      actorUserId,
      action: "CREATE_SUBSCRIPTION",
      entityType: "SUBSCRIPTION",
      entityId: subscription.id,
      afterData: subscription,
    });

    return subscription;
  }

  /**
   * List subscriptions with pagination and status/customer filtering.
   */
  static async listSubscriptions(params: {
    page?: number;
    pageSize?: number;
    customerId?: string;
    status?: SubscriptionStatus;
    search?: string;
  }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.customerId) {
      where.customerId = params.customerId;
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.search) {
      where.OR = [
        { subscriptionNumber: { contains: params.search, mode: "insensitive" } },
        { customer: { fullName: { contains: params.search, mode: "insensitive" } } },
        { customer: { companyName: { contains: params.search, mode: "insensitive" } } },
        { plan: { name: { contains: params.search, mode: "insensitive" } } },
      ];
    }

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          plan: true,
          _count: {
            select: {
              items: true,
              invoices: true,
            },
          },
        },
      }),
    ]);

    const pagination: PaginationParams = {
      page,
      pageSize,
      total,
    };

    return { subscriptions, pagination };
  }

  /**
   * Get single subscription with full details.
   */
  static async getSubscriptionById(id: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: true,
        quotation: true,
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        billingAttempts: {
          orderBy: { attemptedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundError(`Subscription with ID '${id}' not found`);
    }

    return subscription;
  }

  /**
   * Activate subscription (e.g. from TRIALING or manually).
   */
  static async activateSubscription(id: string, actorUserId?: string) {
    const subscription = await SubscriptionService.getSubscriptionById(id);

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BusinessRuleError("Cannot reactivate a cancelled subscription. A new subscription must be created.");
    }
    if (subscription.status === SubscriptionStatus.ACTIVE) {
      return subscription;
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.ACTIVE },
      include: { customer: true, plan: true, items: true },
    });

    await createAuditLog({
      actorUserId,
      action: "ACTIVATE_SUBSCRIPTION",
      entityType: "SUBSCRIPTION",
      entityId: id,
      beforeData: subscription,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Pause subscription.
   * Paused subscriptions do not generate recurring invoices.
   */
  static async pauseSubscription(id: string, actorUserId?: string) {
    const subscription = await SubscriptionService.getSubscriptionById(id);

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BusinessRuleError(
        `Cannot pause subscription with status '${subscription.status}'. Only ACTIVE subscriptions can be paused.`
      );
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.PAUSED },
      include: { customer: true, plan: true, items: true },
    });

    await createAuditLog({
      actorUserId,
      action: "PAUSE_SUBSCRIPTION",
      entityType: "SUBSCRIPTION",
      entityId: id,
      beforeData: subscription,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Resume paused subscription.
   */
  static async resumeSubscription(id: string, actorUserId?: string) {
    const subscription = await SubscriptionService.getSubscriptionById(id);

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BusinessRuleError(
        `Cannot resume subscription with status '${subscription.status}'. Only PAUSED subscriptions can be resumed.`
      );
    }

    // If next billing date passed during pause, advance period to now
    let nextBillingDate = subscription.nextBillingDate;
    let currentPeriodStart = subscription.currentPeriodStart;
    let currentPeriodEnd = subscription.currentPeriodEnd;

    const now = new Date();
    if (nextBillingDate <= now) {
      const recalculated = calculateBillingPeriod(
        now,
        subscription.billingInterval as unknown as BillingInterval,
        subscription.intervalCount,
        subscription.currentPeriodStart.getUTCDate()
      );
      currentPeriodStart = recalculated.periodStart;
      currentPeriodEnd = recalculated.periodEnd;
      nextBillingDate = recalculated.periodEnd;
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart,
        currentPeriodEnd,
        nextBillingDate,
      },
      include: { customer: true, plan: true, items: true },
    });

    await createAuditLog({
      actorUserId,
      action: "RESUME_SUBSCRIPTION",
      entityType: "SUBSCRIPTION",
      entityId: id,
      beforeData: subscription,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Cancel subscription immediately or at period end.
   */
  static async cancelSubscription(
    id: string,
    params: { reason?: string; immediate?: boolean } = {},
    actorUserId?: string
  ) {
    const subscription = await SubscriptionService.getSubscriptionById(id);

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BusinessRuleError("Subscription is already cancelled");
    }

    const isImmediate = params.immediate !== false;
    const now = new Date();
    const effectiveCancellationDate = isImmediate ? now : subscription.currentPeriodEnd;

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: effectiveCancellationDate,
        cancellationReason: params.reason || "Customer requested cancellation",
      },
      include: { customer: true, plan: true, items: true },
    });

    await createAuditLog({
      actorUserId,
      action: "CANCEL_SUBSCRIPTION",
      entityType: "SUBSCRIPTION",
      entityId: id,
      beforeData: subscription,
      afterData: updated,
    });

    return updated;
  }
}
