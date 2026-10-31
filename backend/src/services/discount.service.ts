import { prisma } from "../database/prisma";
import { ConflictError, NotFoundError, BusinessRuleError } from "../utils/errors";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";
import { DiscountType, DiscountScope } from "@sms/shared";

export interface ParsedDiscountMetadata {
  name: string;
  scope: DiscountScope;
  minQuantity?: number | null;
  minOrderAmountMinor?: string | null;
  maxDiscountAmountMinor?: string | null;
  recurringCycleCount?: number | null;
  maxRedemptionsPerCustomer?: number | null;
}

export function formatDiscountName(baseName: string, meta: Partial<ParsedDiscountMetadata>): string {
  const parts = (baseName || "").split("__RULE_META__:");
  const cleanBaseName = (parts[0] || "").trim();
  const metaObj: Record<string, any> = {};
  if (meta.scope) metaObj.scope = meta.scope;
  if (meta.minQuantity !== undefined) metaObj.minQuantity = meta.minQuantity;
  if (meta.minOrderAmountMinor !== undefined)
    metaObj.minOrderAmountMinor = meta.minOrderAmountMinor ? meta.minOrderAmountMinor.toString() : null;
  if (meta.maxDiscountAmountMinor !== undefined)
    metaObj.maxDiscountAmountMinor = meta.maxDiscountAmountMinor ? meta.maxDiscountAmountMinor.toString() : null;
  if (meta.recurringCycleCount !== undefined) metaObj.recurringCycleCount = meta.recurringCycleCount;
  if (meta.maxRedemptionsPerCustomer !== undefined) metaObj.maxRedemptionsPerCustomer = meta.maxRedemptionsPerCustomer;

  if (Object.keys(metaObj).length === 0) {
    return cleanBaseName;
  }
  return `${cleanBaseName} __RULE_META__:${JSON.stringify(metaObj)}`;
}

export function parseDiscountMetadata(rawName: string): ParsedDiscountMetadata {
  const separator = "__RULE_META__:";
  if (!rawName || !rawName.includes(separator)) {
    return {
      name: rawName || "",
      scope: "SUBSCRIPTION" as DiscountScope,
      minQuantity: null,
      minOrderAmountMinor: null,
      maxDiscountAmountMinor: null,
      recurringCycleCount: null,
      maxRedemptionsPerCustomer: null,
    };
  }

  const parts = rawName.split(separator);
  const baseName = parts[0] || "";
  const jsonStr = parts[1] || "{}";
  try {
    const parsed = JSON.parse(jsonStr.trim());
    return {
      name: baseName.trim(),
      scope: (parsed.scope || "SUBSCRIPTION") as DiscountScope,
      minQuantity: parsed.minQuantity !== undefined ? parsed.minQuantity : null,
      minOrderAmountMinor: parsed.minOrderAmountMinor !== undefined ? parsed.minOrderAmountMinor : null,
      maxDiscountAmountMinor: parsed.maxDiscountAmountMinor !== undefined ? parsed.maxDiscountAmountMinor : null,
      recurringCycleCount: parsed.recurringCycleCount !== undefined ? parsed.recurringCycleCount : null,
      maxRedemptionsPerCustomer: parsed.maxRedemptionsPerCustomer !== undefined ? parsed.maxRedemptionsPerCustomer : null,
    };
  } catch {
    return {
      name: (baseName || "").trim(),
      scope: "SUBSCRIPTION" as DiscountScope,
      minQuantity: null,
      minOrderAmountMinor: null,
      maxDiscountAmountMinor: null,
      recurringCycleCount: null,
      maxRedemptionsPerCustomer: null,
    };
  }
}

export function enrichDiscountWithMetadata(discount: any) {
  if (!discount) return discount;
  const meta = parseDiscountMetadata(discount.name);
  return {
    ...discount,
    name: meta.name,
    scope: meta.scope,
    minQuantity: meta.minQuantity,
    minOrderAmountMinor: meta.minOrderAmountMinor,
    maxDiscountAmountMinor: meta.maxDiscountAmountMinor,
    recurringCycleCount: meta.recurringCycleCount,
    maxRedemptionsPerCustomer: meta.maxRedemptionsPerCustomer,
  };
}

export class DiscountService {
  /**
   * List all discounts with pagination, search, and status filters.
   */
  static async getDiscounts(
    pagination: {
      page: number;
      pageSize: number;
      search?: string;
      isActive?: boolean;
      discountType?: DiscountType;
    }
  ) {
    const where: any = {};

    if (pagination.isActive !== undefined) {
      where.isActive = pagination.isActive;
    }

    if (pagination.discountType) {
      where.discountType = pagination.discountType;
    }

    if (pagination.search) {
      where.OR = [
        { name: { contains: pagination.search, mode: "insensitive" } },
        { code: { contains: pagination.search, mode: "insensitive" } },
      ];
    }

    const [total, rawDiscounts] = await Promise.all([
      prisma.discount.count({ where }),
      prisma.discount.findMany({
        where,
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          discountProducts: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
          _count: {
            select: { discountApplications: true },
          },
        },
      }),
    ]);

    const discounts = rawDiscounts.map((d) => enrichDiscountWithMetadata(d));

    const paginationMeta: PaginationParams = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    };

    return { discounts, pagination: paginationMeta };
  }

  /**
   * Get single discount by ID with assigned products and recent redemptions.
   */
  static async getDiscountById(id: string) {
    const rawDiscount = await prisma.discount.findUnique({
      where: { id },
      include: {
        discountProducts: {
          include: {
            product: true,
          },
        },
        discountApplications: {
          take: 50,
          orderBy: { appliedAt: "desc" },
          include: {
            invoice: {
              select: { id: true, invoiceNumber: true, customerId: true },
            },
            quotation: {
              select: { id: true, quotationNumber: true },
            },
          },
        },
      },
    });

    if (!rawDiscount) {
      throw new NotFoundError(`Discount with ID ${id} not found`);
    }

    return enrichDiscountWithMetadata(rawDiscount);
  }

  /**
   * Create a new discount rule.
   */
  static async createDiscount(
    data: {
      code: string;
      name: string;
      discountType: DiscountType;
      valueMinorOrBasisPoints: string | bigint;
      startDate?: string | null;
      endDate?: string | null;
      maxRedemptions?: number | null;
      isActive?: boolean;
      productIds?: string[];
      scope?: DiscountScope;
      minQuantity?: number | null;
      minOrderAmountMinor?: string | null;
      maxDiscountAmountMinor?: string | null;
      recurringCycleCount?: number | null;
      maxRedemptionsPerCustomer?: number | null;
    },
    actorUserId?: string
  ) {
    const existing = await prisma.discount.findUnique({
      where: { code: data.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictError(`Discount with code '${data.code}' already exists`);
    }

    const formattedName = formatDiscountName(data.name, {
      scope: data.scope,
      minQuantity: data.minQuantity,
      minOrderAmountMinor: data.minOrderAmountMinor,
      maxDiscountAmountMinor: data.maxDiscountAmountMinor,
      recurringCycleCount: data.recurringCycleCount,
      maxRedemptionsPerCustomer: data.maxRedemptionsPerCustomer,
    });

    const discount = await prisma.$transaction(async (tx) => {
      const created = await tx.discount.create({
        data: {
          code: data.code.trim().toUpperCase(),
          name: formattedName,
          discountType: data.discountType,
          valueMinorOrBasisPoints: BigInt(data.valueMinorOrBasisPoints),
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          maxRedemptions: data.maxRedemptions ?? null,
          isActive: data.isActive ?? true,
        },
      });

      if (data.productIds && data.productIds.length > 0) {
        for (const productId of data.productIds) {
          await tx.discountProduct.create({
            data: {
              discount: { connect: { id: created.id } },
              product: { connect: { id: productId } },
            },
          });
        }
      }

      return tx.discount.findUnique({
        where: { id: created.id },
        include: { discountProducts: { include: { product: true } } },
      });
    });

    const enriched = enrichDiscountWithMetadata(discount);

    await createAuditLog({
      actorUserId,
      action: "CREATE_DISCOUNT",
      entityType: "DISCOUNT",
      entityId: discount!.id,
      beforeData: null,
      afterData: enriched,
    });

    return enriched;
  }

  /**
   * Update an existing discount.
   */
  static async updateDiscount(
    id: string,
    data: {
      name?: string;
      discountType?: DiscountType;
      valueMinorOrBasisPoints?: string | bigint;
      startDate?: string | null;
      endDate?: string | null;
      maxRedemptions?: number | null;
      isActive?: boolean;
      productIds?: string[];
      scope?: DiscountScope;
      minQuantity?: number | null;
      minOrderAmountMinor?: string | null;
      maxDiscountAmountMinor?: string | null;
      recurringCycleCount?: number | null;
      maxRedemptionsPerCustomer?: number | null;
    },
    actorUserId?: string
  ) {
    const currentDiscount = await this.getDiscountById(id);

    const mergedName = data.name !== undefined ? data.name : currentDiscount.name;
    const mergedScope = data.scope !== undefined ? data.scope : currentDiscount.scope;
    const mergedMinQuantity =
      data.minQuantity !== undefined ? data.minQuantity : currentDiscount.minQuantity;
    const mergedMinOrderAmountMinor =
      data.minOrderAmountMinor !== undefined
        ? data.minOrderAmountMinor
        : currentDiscount.minOrderAmountMinor;
    const mergedMaxDiscountAmountMinor =
      data.maxDiscountAmountMinor !== undefined
        ? data.maxDiscountAmountMinor
        : currentDiscount.maxDiscountAmountMinor;
    const mergedRecurringCycleCount =
      data.recurringCycleCount !== undefined
        ? data.recurringCycleCount
        : currentDiscount.recurringCycleCount;
    const mergedMaxRedemptionsPerCustomer =
      data.maxRedemptionsPerCustomer !== undefined
        ? data.maxRedemptionsPerCustomer
        : currentDiscount.maxRedemptionsPerCustomer;

    const formattedName = formatDiscountName(mergedName, {
      scope: mergedScope,
      minQuantity: mergedMinQuantity,
      minOrderAmountMinor: mergedMinOrderAmountMinor,
      maxDiscountAmountMinor: mergedMaxDiscountAmountMinor,
      recurringCycleCount: mergedRecurringCycleCount,
      maxRedemptionsPerCustomer: mergedMaxRedemptionsPerCustomer,
    });

    const updated = await prisma.$transaction(async (tx) => {
      const updatePayload: any = {
        name: formattedName,
      };
      if (data.discountType !== undefined) updatePayload.discountType = data.discountType;
      if (data.valueMinorOrBasisPoints !== undefined)
        updatePayload.valueMinorOrBasisPoints = BigInt(data.valueMinorOrBasisPoints);
      if (data.startDate !== undefined)
        updatePayload.startDate = data.startDate ? new Date(data.startDate) : null;
      if (data.endDate !== undefined)
        updatePayload.endDate = data.endDate ? new Date(data.endDate) : null;
      if (data.maxRedemptions !== undefined)
        updatePayload.maxRedemptions = data.maxRedemptions;
      if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

      await tx.discount.update({
        where: { id },
        data: updatePayload,
      });

      if (data.productIds !== undefined) {
        // Sync product links
        await tx.discountProduct.deleteMany({
          where: {
            discountId: id,
            productId: { notIn: data.productIds },
          },
        });

        for (const pId of data.productIds) {
          await tx.discountProduct.upsert({
            where: {
              discountId_productId: { discountId: id, productId: pId },
            },
            update: {},
            create: {
              discount: { connect: { id } },
              product: { connect: { id: pId } },
            },
          });
        }
      }

      return tx.discount.findUnique({
        where: { id },
        include: { discountProducts: { include: { product: true } } },
      });
    });

    const enriched = enrichDiscountWithMetadata(updated);

    await createAuditLog({
      actorUserId,
      action: "UPDATE_DISCOUNT",
      entityType: "DISCOUNT",
      entityId: id,
      beforeData: currentDiscount,
      afterData: enriched,
    });

    return enriched;
  }

  /**
   * Toggle discount activation.
   */
  static async setDiscountStatus(id: string, isActive: boolean, actorUserId?: string) {
    const currentDiscount = await this.getDiscountById(id);

    const updated = await prisma.discount.update({
      where: { id },
      data: { isActive },
    });

    const enriched = enrichDiscountWithMetadata(updated);

    await createAuditLog({
      actorUserId,
      action: isActive ? "ACTIVATE_DISCOUNT" : "DEACTIVATE_DISCOUNT",
      entityType: "DISCOUNT",
      entityId: id,
      beforeData: currentDiscount,
      afterData: enriched,
    });

    return enriched;
  }

  /**
   * Attach an eligible discount to a subscription for recurring discount application.
   */
  static async attachDiscountToSubscription(
    data: {
      subscriptionId: string;
      discountCode: string;
    },
    actorUserId?: string
  ) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: data.subscriptionId },
      include: { customer: true },
    });
    if (!subscription) {
      throw new NotFoundError(`Subscription ${data.subscriptionId} not found`);
    }

    const rawDiscount = await prisma.discount.findUnique({
      where: { code: data.discountCode.trim().toUpperCase() },
    });
    if (!rawDiscount) {
      throw new NotFoundError(`Discount '${data.discountCode}' not found`);
    }

    if (!rawDiscount.isActive) {
      throw new BusinessRuleError(`Discount '${data.discountCode}' is currently inactive`);
    }

    const now = new Date();
    if (rawDiscount.endDate && now > rawDiscount.endDate) {
      throw new BusinessRuleError(`Discount '${data.discountCode}' has expired`);
    }

    // Check if discount is already attached to this subscription
    const existing = await prisma.discountApplication.findFirst({
      where: {
        subscriptionId: data.subscriptionId,
        discountId: rawDiscount.id,
        invoiceId: null,
      },
    });

    if (existing) {
      throw new ConflictError(
        `Discount '${data.discountCode}' is already attached to this subscription`
      );
    }

    const application = await prisma.discountApplication.create({
      data: {
        subscriptionId: data.subscriptionId,
        discountId: rawDiscount.id,
        amountDeductedMinor: 0n,
      },
      include: {
        discount: true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "ATTACH_DISCOUNT_SUBSCRIPTION",
      entityType: "SUBSCRIPTION",
      entityId: data.subscriptionId,
      beforeData: null,
      afterData: {
        discountCode: data.discountCode,
        applicationId: application.id,
      },
    });

    return {
      success: true,
      message: `Discount '${data.discountCode}' attached to subscription successfully`,
      application: {
        ...application,
        discount: enrichDiscountWithMetadata(application.discount),
      },
    };
  }

  /**
   * View redemptions history for a discount.
   */
  static async getDiscountRedemptions(id: string) {
    const discount = await this.getDiscountById(id);

    const applications = await prisma.discountApplication.findMany({
      where: { discountId: id },
      orderBy: { appliedAt: "desc" },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            customerId: true,
            customer: { select: { fullName: true, companyName: true, email: true } },
          },
        },
        quotation: {
          select: { id: true, quotationNumber: true },
        },
      },
    });

    return {
      discount,
      totalRedemptions: applications.length,
      applications,
    };
  }
}
