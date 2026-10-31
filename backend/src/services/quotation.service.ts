import { prisma } from "../database/prisma";
import { QuotationStatus, SubscriptionStatus, BillingInterval } from "@sms/shared";
import { BusinessRuleError, ConflictError, NotFoundError } from "../utils/errors";
import { SequenceService } from "./sequence.service";
import { getProductWithVariant } from "./contracts";
import { calculateLineSubtotal } from "./financial-calculator.service";
import { calculateBillingPeriod } from "./billing-period";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";

export interface CreateQuotationItemInput {
  productId: string;
  productVariantId?: string | null;
  description?: string | null;
  quantity?: string | number;
  unitPriceMinor?: string | number | bigint;
}

export interface CreateQuotationInput {
  customerId: string;
  templateId?: string | null;
  validUntil: string | Date;
  notes?: string | null;
  currency?: string;
  items: CreateQuotationItemInput[];
}

export class QuotationService {
  /**
   * Create a new quotation in DRAFT status with items and snapshots.
   */
  static async createQuotation(data: CreateQuotationInput, actorUserId?: string) {
    if (!data.items || data.items.length === 0) {
      throw new BusinessRuleError("A quotation must have at least one line item");
    }

    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer || !customer.isActive) {
      throw new NotFoundError(`Customer with ID '${data.customerId}' not found or inactive`);
    }

    const validUntilDate = new Date(data.validUntil);
    if (isNaN(validUntilDate.getTime())) {
      throw new BusinessRuleError("Invalid validUntil date format");
    }

    // Resolve products, variants, and line amounts
    let calculatedTotalMinor = 0n;
    const resolvedItems: Array<{
      productId: string;
      productVariantId?: string | null;
      description: string;
      quantity: string;
      unitPriceMinor: bigint;
      totalAmountMinor: bigint;
    }> = [];

    for (const item of data.items) {
      const { product, variant, finalPriceMinor } = await getProductWithVariant(
        item.productId,
        item.productVariantId || undefined
      );

      const unitPriceMinor = item.unitPriceMinor !== undefined
        ? BigInt(item.unitPriceMinor)
        : BigInt(finalPriceMinor);

      const quantityStr = item.quantity !== undefined ? String(item.quantity) : "1.000";
      const lineTotal = calculateLineSubtotal(quantityStr, unitPriceMinor);
      calculatedTotalMinor += lineTotal;

      const desc = item.description || (variant ? `${product.name} - ${variant.name}` : product.name);

      resolvedItems.push({
        productId: product.id,
        productVariantId: variant?.id || null,
        description: desc,
        quantity: quantityStr,
        unitPriceMinor,
        totalAmountMinor: lineTotal,
      });
    }

    const quotationNumber = await SequenceService.getNextNumber("QUO");

    const quotation = await prisma.$transaction(async (tx) => {
      const created = await tx.quotation.create({
        data: {
          quotationNumber,
          customerId: data.customerId,
          templateId: data.templateId || null,
          status: QuotationStatus.DRAFT,
          currency: data.currency || customer.currency || "INR",
          totalAmountMinor: calculatedTotalMinor,
          validUntil: validUntilDate,
          notes: data.notes || null,
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              productVariantId: item.productVariantId,
              description: item.description,
              quantity: item.quantity,
              unitPriceMinor: item.unitPriceMinor,
              totalAmountMinor: item.totalAmountMinor,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
          customer: true,
          template: true,
        },
      });

      return created;
    });

    await createAuditLog({
      actorUserId,
      action: "CREATE_QUOTATION",
      entityType: "QUOTATION",
      entityId: quotation.id,
      afterData: quotation,
    });

    return quotation;
  }

  /**
   * List quotations with pagination, status filter, and customer scoping.
   */
  static async listQuotations(params: {
    page?: number;
    pageSize?: number;
    customerId?: string;
    status?: QuotationStatus;
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
        { quotationNumber: { contains: params.search, mode: "insensitive" } },
        { customer: { fullName: { contains: params.search, mode: "insensitive" } } },
        { customer: { companyName: { contains: params.search, mode: "insensitive" } } },
        { notes: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [total, quotations] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          template: true,
          subscription: {
            select: {
              id: true,
              subscriptionNumber: true,
              status: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
    ]);

    const pagination: PaginationParams = {
      page,
      pageSize,
      total,
    };

    return { quotations, pagination };
  }

  /**
   * Retrieve single quotation with items and related entities.
   */
  static async getQuotationById(id: string) {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        template: true,
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        subscription: true,
      },
    });

    if (!quotation) {
      throw new NotFoundError(`Quotation with ID '${id}' not found`);
    }

    return quotation;
  }

  /**
   * Update draft quotation.
   */
  static async updateQuotation(
    id: string,
    data: Partial<CreateQuotationInput>,
    actorUserId?: string
  ) {
    const existing = await QuotationService.getQuotationById(id);

    if (existing.status !== QuotationStatus.DRAFT) {
      throw new BusinessRuleError(
        `Cannot edit quotation in status '${existing.status}'. Only DRAFT quotations can be modified.`
      );
    }

    return prisma.$transaction(async (tx) => {
      let totalAmountMinor = existing.totalAmountMinor;

      if (data.items) {
        if (data.items.length === 0) {
          throw new BusinessRuleError("A quotation must have at least one line item");
        }

        // Delete previous items
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });

        totalAmountMinor = 0n;
        for (const item of data.items) {
          const { product, variant, finalPriceMinor } = await getProductWithVariant(
            item.productId,
            item.productVariantId || undefined
          );

          const unitPriceMinor = item.unitPriceMinor !== undefined
            ? BigInt(item.unitPriceMinor)
            : BigInt(finalPriceMinor);

          const quantityStr = item.quantity !== undefined ? String(item.quantity) : "1.000";
          const lineTotal = calculateLineSubtotal(quantityStr, unitPriceMinor);
          totalAmountMinor += lineTotal;

          const desc = item.description || (variant ? `${product.name} - ${variant.name}` : product.name);

          await tx.quotationItem.create({
            data: {
              quotationId: id,
              productId: product.id,
              productVariantId: variant?.id || null,
              description: desc,
              quantity: quantityStr,
              unitPriceMinor,
              totalAmountMinor: lineTotal,
            },
          });
        }
      }

      const updated = await tx.quotation.update({
        where: { id },
        data: {
          templateId: data.templateId !== undefined ? data.templateId : existing.templateId,
          validUntil: data.validUntil ? new Date(data.validUntil) : existing.validUntil,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          totalAmountMinor,
        },
        include: {
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
          customer: true,
          template: true,
        },
      });

      await createAuditLog({
        actorUserId,
        action: "UPDATE_QUOTATION",
        entityType: "QUOTATION",
        entityId: id,
        beforeData: existing,
        afterData: updated,
      });

      return updated;
    });
  }

  /**
   * Transition quotation from DRAFT to SENT.
   */
  static async sendQuotation(id: string, actorUserId?: string) {
    const quotation = await QuotationService.getQuotationById(id);

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BusinessRuleError(
        `Cannot send quotation in status '${quotation.status}'. Only DRAFT quotations can be marked as SENT.`
      );
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.SENT },
      include: { customer: true, items: true },
    });

    await createAuditLog({
      actorUserId,
      action: "SEND_QUOTATION",
      entityType: "QUOTATION",
      entityId: id,
      beforeData: quotation,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Transition quotation from SENT to ACCEPTED.
   * Auto-rejects if quotation validity has expired.
   */
  static async acceptQuotation(id: string, actorUserId?: string) {
    const quotation = await QuotationService.getQuotationById(id);

    if (quotation.status !== QuotationStatus.SENT) {
      throw new BusinessRuleError(
        `Cannot accept quotation in status '${quotation.status}'. Only SENT quotations can be accepted.`
      );
    }

    const now = new Date();
    if (quotation.validUntil < now) {
      await prisma.quotation.update({
        where: { id },
        data: { status: QuotationStatus.EXPIRED },
      });
      throw new BusinessRuleError("Cannot accept an expired quotation. Status updated to EXPIRED.");
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.ACCEPTED },
      include: { customer: true, items: true },
    });

    await createAuditLog({
      actorUserId,
      action: "ACCEPT_QUOTATION",
      entityType: "QUOTATION",
      entityId: id,
      beforeData: quotation,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Transition quotation from SENT to REJECTED.
   */
  static async rejectQuotation(id: string, reason?: string, actorUserId?: string) {
    const quotation = await QuotationService.getQuotationById(id);

    if (quotation.status !== QuotationStatus.SENT && quotation.status !== QuotationStatus.DRAFT) {
      throw new BusinessRuleError(
        `Cannot reject quotation in status '${quotation.status}'. Only DRAFT or SENT quotations can be rejected.`
      );
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.REJECTED,
        notes: reason ? `${quotation.notes || ""}\nRejection Reason: ${reason}`.trim() : quotation.notes,
      },
      include: { customer: true, items: true },
    });

    await createAuditLog({
      actorUserId,
      action: "REJECT_QUOTATION",
      entityType: "QUOTATION",
      entityId: id,
      beforeData: quotation,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Expire a quotation whose validUntil date has passed.
   */
  static async expireQuotation(id: string, actorUserId?: string) {
    const quotation = await QuotationService.getQuotationById(id);

    if (quotation.status === QuotationStatus.ACCEPTED) {
      throw new BusinessRuleError("Cannot expire an already ACCEPTED quotation.");
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.EXPIRED },
    });

    await createAuditLog({
      actorUserId,
      action: "EXPIRE_QUOTATION",
      entityType: "QUOTATION",
      entityId: id,
      beforeData: quotation,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Convert an ACCEPTED quotation into an ACTIVE subscription.
   * Transactionally preserves commercial terms, creates subscription items,
   * prevents duplicate conversion, and records source quotation.
   */
  static async convertToSubscription(
    id: string,
    params: {
      billingInterval?: BillingInterval;
      intervalCount?: number;
      startDate?: Date | string;
    } = {},
    actorUserId?: string
  ) {
    const quotation = await QuotationService.getQuotationById(id);

    if (quotation.status !== QuotationStatus.ACCEPTED) {
      throw new BusinessRuleError(
        `Cannot convert quotation with status '${quotation.status}'. Only ACCEPTED quotations can be converted into subscriptions.`
      );
    }

    if (quotation.subscription) {
      throw new ConflictError(
        `Quotation '${quotation.quotationNumber}' has already been converted to subscription '${quotation.subscription.subscriptionNumber}'`
      );
    }

    if (quotation.items.length === 0) {
      throw new BusinessRuleError("Cannot convert a quotation with no items into a subscription");
    }

    const interval = params.billingInterval || BillingInterval.MONTHLY;
    const intervalCount = params.intervalCount || 1;
    const startDate = params.startDate ? new Date(params.startDate) : new Date();

    const { periodStart, periodEnd } = calculateBillingPeriod(startDate, interval, intervalCount);
    const subscriptionNumber = await SequenceService.getNextNumber("SUB");

    const subscription = await prisma.$transaction(async (tx) => {
      // Create subscription
      const sub = await tx.subscription.create({
        data: {
          subscriptionNumber,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          status: SubscriptionStatus.ACTIVE,
          billingInterval: interval,
          intervalCount,
          currency: quotation.currency,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          nextBillingDate: periodEnd,
          items: {
            create: quotation.items.map((item) => ({
              productId: item.productId,
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              unitPriceMinor: item.unitPriceMinor,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
          customer: true,
          quotation: true,
        },
      });

      return sub;
    });

    await createAuditLog({
      actorUserId,
      action: "CONVERT_QUOTATION_TO_SUBSCRIPTION",
      entityType: "SUBSCRIPTION",
      entityId: subscription.id,
      afterData: subscription,
    });

    return subscription;
  }
}

