import { prisma } from "../database/prisma";
import {
  ConflictError,
  NotFoundError,
  BusinessRuleError,
} from "../utils/errors";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";

export class PlanService {
  /**
   * Contract C: Plan lookup for subscription creation.
   * Ensures plan and planPrice are valid and active.
   */
  static async getActivePlanWithPrice(
    planId: string,
    planPriceId: string,
    requestedQuantity?: number
  ) {
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        prices: true,
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
      },
    });

    if (!plan || !plan.isActive) {
      throw new BusinessRuleError(`Plan ${planId} is inactive or not found`);
    }

    const now = new Date();

    // Check availability start date
    if (plan.startDate && now < plan.startDate) {
      throw new BusinessRuleError(
        `Plan '${plan.name}' is not yet available for subscriptions (starts at ${plan.startDate.toISOString()})`
      );
    }

    // Check availability end date
    if (plan.endDate && now > plan.endDate) {
      throw new BusinessRuleError(
        `Plan '${plan.name}' is no longer available for new subscriptions (ended on ${plan.endDate.toISOString()})`
      );
    }

    // Check minimum purchase quantity
    if (requestedQuantity !== undefined && requestedQuantity < plan.minQuantity) {
      throw new BusinessRuleError(
        `Requested quantity (${requestedQuantity}) is below the required minimum quantity (${plan.minQuantity}) for plan '${plan.name}'`
      );
    }

    const price = plan.prices.find((p) => p.id === planPriceId);
    if (!price || !price.isActive) {
      throw new BusinessRuleError(`Plan price ${planPriceId} is inactive or not found on plan ${planId}`);
    }

    return {
      plan,
      price,
    };
  }

  /**
   * Create a new plan with price configurations and included product items.
   * Validates that all selected products and variants are active.
   */
  static async createPlan(data: any, actorUserId?: string) {
    const existingCode = await prisma.plan.findUnique({
      where: { code: data.code },
    });
    if (existingCode) {
      throw new ConflictError(`Plan with code '${data.code}' already exists`);
    }

    // Validate that items reference existing and active products/variants
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || !product.isActive || product.isArchived) {
          throw new BusinessRuleError(
            `Cannot add inactive or archived product (${item.productId}) to a new plan`
          );
        }

        if (item.productVariantId) {
          const variant = await prisma.productVariant.findFirst({
            where: {
              id: item.productVariantId,
              productId: item.productId,
              isActive: true,
              isArchived: false,
            },
          });
          if (!variant) {
            throw new BusinessRuleError(
              `Variant ${item.productVariantId} does not exist or is inactive on product ${item.productId}`
            );
          }
        }
      }
    }

    const plan = await prisma.plan.create({
      data: {
        code: data.code.trim(),
        name: data.name.trim(),
        description: data.description || null,
        minQuantity: data.minQuantity !== undefined ? Number(data.minQuantity) : 1,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        autoCloseOnEndDate: data.autoCloseOnEndDate !== undefined ? Boolean(data.autoCloseOnEndDate) : true,
        allowEarlyClosure: data.allowEarlyClosure !== undefined ? Boolean(data.allowEarlyClosure) : false,
        allowPause: data.allowPause !== undefined ? Boolean(data.allowPause) : true,
        allowRenewal: data.allowRenewal !== undefined ? Boolean(data.allowRenewal) : true,
        prices: {
          create: data.prices.map((p: any) => ({
            currency: p.currency || "INR",
            billingInterval: p.billingInterval || "MONTHLY",
            intervalCount: p.intervalCount || 1,
            amountMinor: BigInt(p.amountMinor),
            setupFeeMinor: BigInt(p.setupFeeMinor || "0"),
            isActive: p.isActive !== undefined ? p.isActive : true,
          })),
        },
        items: data.items?.length
          ? {
              create: data.items.map((i: any) => ({
                productId: i.productId,
                productVariantId: i.productVariantId || null,
                quantity: i.quantity || "1.000",
              })),
            }
          : undefined,
      },
      include: {
        prices: true,
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
      action: "CREATE_PLAN",
      entityType: "PLAN",
      entityId: plan.id,
      afterData: plan,
    });

    return plan;
  }

  /**
   * List plans with pagination, search, and active filtering.
   */
  static async getPlans(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [plans, total] = await Promise.all([
      prisma.plan.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [params.sortBy || "createdAt"]: params.sortOrder || "desc",
        },
        include: {
          prices: {
            where: { isActive: true },
          },
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
        },
      }),
      prisma.plan.count({ where }),
    ]);

    const pagination: PaginationParams = {
      page,
      pageSize,
      total,
    };

    return { plans, pagination };
  }

  /**
   * Get plan by ID.
   */
  static async getPlanById(id: string) {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        prices: true,
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundError(`Plan with ID ${id} not found`);
    }

    return plan;
  }

  /**
   * Update plan metadata. Existing subscriptions remain unaffected.
   */
  static async updatePlan(id: string, data: any, actorUserId?: string) {
    const existing = await PlanService.getPlanById(id);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.minQuantity !== undefined) updateData.minQuantity = Number(data.minQuantity);
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.autoCloseOnEndDate !== undefined) updateData.autoCloseOnEndDate = Boolean(data.autoCloseOnEndDate);
    if (data.allowEarlyClosure !== undefined) updateData.allowEarlyClosure = Boolean(data.allowEarlyClosure);
    if (data.allowPause !== undefined) updateData.allowPause = Boolean(data.allowPause);
    if (data.allowRenewal !== undefined) updateData.allowRenewal = Boolean(data.allowRenewal);

    const updated = await prisma.plan.update({
      where: { id },
      data: updateData,
      include: {
        prices: true,
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
      action: "UPDATE_PLAN",
      entityType: "PLAN",
      entityId: id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Activate plan.
   */
  static async activatePlan(id: string, actorUserId?: string) {
    return PlanService.updatePlan(id, { isActive: true }, actorUserId);
  }

  /**
   * Deactivate plan.
   */
  static async deactivatePlan(id: string, actorUserId?: string) {
    return PlanService.updatePlan(id, { isActive: false }, actorUserId);
  }
}
