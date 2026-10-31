import { prisma } from "../database/prisma";
import { ConflictError, NotFoundError } from "../utils/errors";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";
import { DiscountType } from "@sms/shared";

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

    const [total, discounts] = await Promise.all([
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
    const discount = await prisma.discount.findUnique({
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

    if (!discount) {
      throw new NotFoundError(`Discount with ID ${id} not found`);
    }

    return discount;
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
    },
    actorUserId?: string
  ) {
    const existing = await prisma.discount.findUnique({
      where: { code: data.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictError(`Discount with code '${data.code}' already exists`);
    }

    const discount = await prisma.$transaction(async (tx) => {
      const created = await tx.discount.create({
        data: {
          code: data.code.trim().toUpperCase(),
          name: data.name.trim(),
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
              discountId: created.id,
              productId,
            },
          });
        }
      }

      return tx.discount.findUnique({
        where: { id: created.id },
        include: { discountProducts: { include: { product: true } } },
      });
    });

    await createAuditLog({
      actorUserId,
      action: "CREATE_DISCOUNT",
      entityType: "DISCOUNT",
      entityId: discount!.id,
      beforeData: null,
      afterData: discount,
    });

    return discount;
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
    },
    actorUserId?: string
  ) {
    const currentDiscount = await this.getDiscountById(id);

    const updated = await prisma.$transaction(async (tx) => {
      const updatePayload: any = {};
      if (data.name !== undefined) updatePayload.name = data.name.trim();
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
            create: { discountId: id, productId: pId },
          });
        }
      }

      return tx.discount.findUnique({
        where: { id },
        include: { discountProducts: { include: { product: true } } },
      });
    });

    await createAuditLog({
      actorUserId,
      action: "UPDATE_DISCOUNT",
      entityType: "DISCOUNT",
      entityId: id,
      beforeData: currentDiscount,
      afterData: updated,
    });

    return updated;
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

    await createAuditLog({
      actorUserId,
      action: isActive ? "ACTIVATE_DISCOUNT" : "DEACTIVATE_DISCOUNT",
      entityType: "DISCOUNT",
      entityId: id,
      beforeData: currentDiscount,
      afterData: updated,
    });

    return updated;
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
