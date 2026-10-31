import { prisma } from "../database/prisma";
import {
  SubscriptionStatus,
  BillingInterval,
} from "@sms/shared";
import { SequenceService } from "../utils/sequence.service";
import { calculateNextBillingPeriod } from "./billing-period";
import { getProductWithVariant, createAuditLog } from "./contracts";
import {
  NotFoundError,
  BusinessRuleError,
} from "../utils/errors";
import { PaginationParams } from "../utils/response";

export interface CreateSubscriptionItemInput {
  productId: string;
  productVariantId?: string | null;
  quantity?: string | number;
  unitPriceMinor?: string | bigint | number;
}

export interface CreateSubscriptionInput {
  quotationId?: string | null;
  customerId?: string;
  planId?: string | null;
  billingInterval?: BillingInterval;
  intervalCount?: number;
  startDate?: string;
  currency?: string;
  items?: CreateSubscriptionItemInput[];
}

export class SubscriptionService {
  /**
   * Creates a subscription from an accepted quotation or manual creation.
   * Transactional and idempotent against duplicate conversion.
   */
  static async createSubscription(
    data: CreateSubscriptionInput,
    actorUserId?: string | null
  ) {
    // A. Quotation Conversion Flow
    if (data.quotationId) {
      return this.convertFromQuotation(data.quotationId, data.billingInterval, actorUserId);
    }

    // B. Manual Creation Flow
    if (!data.customerId) {
      throw new BusinessRuleError("Customer ID is required for manual subscription creation");
    }

    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    const interval = data.billingInterval || BillingInterval.MONTHLY;
    const intervalCount = data.intervalCount || 1;
    const startDate = data.startDate ? new Date(data.startDate) : new Date();

    const period = calculateNextBillingPeriod(
      startDate,
      interval,
      intervalCount,
      startDate.getUTCDate()
    );

    const subscriptionNumber = await SequenceService.getNextNumber("SUB");

    // Resolve items from Plan or from Custom Items
    let itemsToCreate: Array<{
      productId: string;
      productVariantId?: string | null;
      quantity: string;
      unitPriceMinor: bigint;
    }> = [];

    if (data.planId) {
      const plan = await prisma.plan.findUnique({
        where: { id: data.planId },
        include: {
          items: true,
          prices: {
            where: { billingInterval: interval, isActive: true },
          },
        },
      });

      if (!plan) {
        throw new NotFoundError("Plan not found");
      }

      if (plan.items.length > 0) {
        for (const item of plan.items) {
          const { finalPriceMinor } = await getProductWithVariant(
            item.productId,
            item.productVariantId || undefined
          );
          itemsToCreate.push({
            productId: item.productId,
            productVariantId: item.productVariantId,
            quantity: String(item.quantity),
            unitPriceMinor: BigInt(finalPriceMinor),
          });
        }
      }
    }

    if (itemsToCreate.length === 0 && data.items && data.items.length > 0) {
      for (const item of data.items) {
        const { product, variant, finalPriceMinor } = await getProductWithVariant(
          item.productId,
          item.productVariantId || undefined
        );
        const unitPriceMinor = item.unitPriceMinor !== undefined
          ? BigInt(String(item.unitPriceMinor))
          : BigInt(finalPriceMinor);

        itemsToCreate.push({
          productId: product.id,
          productVariantId: variant?.id || null,
          quantity: item.quantity ? String(item.quantity) : "1.000",
          unitPriceMinor,
        });
      }
    }

    if (itemsToCreate.length === 0) {
      throw new BusinessRuleError("Subscription must have at least one product line item");
    }

    const subscription = await prisma.$transaction(async (tx) => {
      return tx.subscription.create({
        data: {
          subscriptionNumber,
          customerId: data.customerId!,
          planId: data.planId || null,
          status: SubscriptionStatus.ACTIVE,
          billingInterval: interval,
          intervalCount,
          currency: data.currency || customer.currency || "INR",
          currentPeriodStart: period.periodStart,
          currentPeriodEnd: period.periodEnd,
          nextBillingDate: period.nextBillingDate,
          items: {
            create: itemsToCreate.map((it) => ({
              productId: it.productId,
              productVariantId: it.productVariantId || null,
              quantity: it.quantity,
              unitPriceMinor: it.unitPriceMinor,
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
   * Converts an ACCEPTED quotation into an ACTIVE subscription transactionally.
   * Prevents duplicate conversion.
   */
  static async convertFromQuotation(
    quotationId: string,
    billingInterval = BillingInterval.MONTHLY,
    actorUserId?: string | null
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch quotation with lock-like precision
      const quotation = await tx.quotation.findUnique({
        where: { id: quotationId },
        include: {
          items: true,
          subscription: true,
          customer: true,
        },
      });

      if (!quotation) {
        throw new NotFoundError("Quotation not found");
      }

      // Check if already converted
      if (quotation.subscription) {
        throw new BusinessRuleError(
          `Quotation ${quotation.quotationNumber} has already been converted into subscription ${quotation.subscription.subscriptionNumber}`
        );
      }

      if (quotation.status !== "ACCEPTED") {
        throw new BusinessRuleError(
          `Only ACCEPTED quotations can be converted into subscriptions. Current status is ${quotation.status}.`
        );
      }

      if (quotation.items.length === 0) {
        throw new BusinessRuleError("Quotation has no items to subscribe to");
      }

      const startDate = new Date();
      const period = calculateNextBillingPeriod(
        startDate,
        billingInterval,
        1,
        startDate.getUTCDate()
      );

      const subscriptionNumber = await SequenceService.getNextNumber("SUB");

      // 2. Create Subscription & SubscriptionItems
      const subscription = await tx.subscription.create({
        data: {
          subscriptionNumber,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          status: SubscriptionStatus.ACTIVE,
          billingInterval,
          intervalCount: 1,
          currency: quotation.currency,
          currentPeriodStart: period.periodStart,
          currentPeriodEnd: period.periodEnd,
          nextBillingDate: period.nextBillingDate,
          items: {
            create: quotation.items.map((it) => ({
              productId: it.productId,
              productVariantId: it.productVariantId,
              quantity: it.quantity,
              unitPriceMinor: it.unitPriceMinor,
            })),
          },
        },
        include: {
          customer: true,
          quotation: true,
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
        },
      });

      return subscription;
    }).then(async (subscription) => {
      await createAuditLog({
        actorUserId,
        action: "CONVERT_QUOTATION_TO_SUBSCRIPTION",
        entityType: "SUBSCRIPTION",
        entityId: subscription.id,
        afterData: subscription,
      });

      return subscription;
    });
  }

  /**
   * Retrieves paginated subscriptions.
   */
  static async getSubscriptions(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: SubscriptionStatus;
    customerId?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { subscriptionNumber: { contains: query.search, mode: "insensitive" } },
        { customer: { fullName: { contains: query.search, mode: "insensitive" } } },
        { customer: { companyName: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
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
            take: 5,
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    const pagination: PaginationParams = { page, pageSize, total };
    return { subscriptions, pagination };
  }

  /**
   * Retrieves a single subscription with its items and recent invoices.
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
        },
        billingAttempts: {
          orderBy: { attemptedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundError("Subscription not found");
    }

    return subscription;
  }

  /**
   * Activates a subscription.
   */
  static async activateSubscription(id: string, actorUserId?: string | null) {
    const sub = await this.getSubscriptionById(id);

    if (sub.status === SubscriptionStatus.ACTIVE) {
      return sub;
    }

    if (sub.status === SubscriptionStatus.CANCELLED) {
      throw new BusinessRuleError("Cannot reactivate a cancelled subscription. Create a new subscription.");
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.ACTIVE },
      include: {
        customer: true,
        items: true,
        invoices: true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "ACTIVATE_SUBSCRIPTION",
      entityType: "SUBSCRIPTION",
      entityId: id,
      beforeData: sub,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Pauses a subscription. Paused subscriptions must not generate invoices.
   */
  static async pauseSubscription(
    id: string,
    _reason?: string | null,
    actorUserId?: string | null
  ) {
    const sub = await this.getSubscriptionById(id);

    if (sub.status !== SubscriptionStatus.ACTIVE) {
      throw new BusinessRuleError(`Cannot pause a subscription that is ${sub.status}. Must be ACTIVE.`);
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.PAUSED },
      include: {
        customer: true,
        items: true,
        invoices: true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "PAUSE_SUBSCRIPTION",
      entityType: "SUBSCRIPTION",
      entityId: id,
      beforeData: sub,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Resumes a paused subscription.
   */
  static async resumeSubscription(id: string, actorUserId?: string | null) {
    const sub = await this.getSubscriptionById(id);

    if (sub.status !== SubscriptionStatus.PAUSED) {
      throw new BusinessRuleError(`Cannot resume a subscription with status ${sub.status}. Must be PAUSED.`);
    }

    // If nextBillingDate is already past, align billing date to current date
    let { currentPeriodStart, currentPeriodEnd, nextBillingDate } = sub;
    const now = new Date();
    if (nextBillingDate <= now) {
      const period = calculateNextBillingPeriod(
        now,
        sub.billingInterval,
        sub.intervalCount,
        now.getUTCDate()
      );
      currentPeriodStart = period.periodStart;
      currentPeriodEnd = period.periodEnd;
      nextBillingDate = period.nextBillingDate;
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart,
        currentPeriodEnd,
        nextBillingDate,
      },
      include: {
        customer: true,
        items: true,
        invoices: true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "RESUME_SUBSCRIPTION",
      entityType: "SUBSCRIPTION",
      entityId: id,
      beforeData: sub,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Cancels a subscription immediately or at the end of the current period.
   */
  static async cancelSubscription(
    id: string,
    cancellationReason?: string | null,
    effectiveImmediately = true,
    actorUserId?: string | null
  ) {
    const sub = await this.getSubscriptionById(id);

    if (sub.status === SubscriptionStatus.CANCELLED) {
      throw new BusinessRuleError("Subscription is already cancelled");
    }

    const now = new Date();
    const cancelledAt = effectiveImmediately ? now : sub.currentPeriodEnd;
    const newStatus = effectiveImmediately ? SubscriptionStatus.CANCELLED : sub.status;

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: newStatus,
        cancelledAt,
        cancellationReason: cancellationReason || null,
      },
      include: {
        customer: true,
        items: true,
        invoices: true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "CANCEL_SUBSCRIPTION",
      entityType: "SUBSCRIPTION",
      entityId: id,
      beforeData: sub,
      afterData: updated,
    });

    return updated;
  }
}
