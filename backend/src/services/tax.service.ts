import { prisma } from "../database/prisma";
import { ConflictError, NotFoundError } from "../utils/errors";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";

export class TaxService {
  /**
   * List all taxes with pagination and optional search.
   */
  static async getTaxes(
    pagination: { page: number; pageSize: number; search?: string; isActive?: boolean }
  ) {
    const where: any = {};

    if (pagination.isActive !== undefined) {
      where.isActive = pagination.isActive;
    }

    if (pagination.search) {
      where.OR = [
        { name: { contains: pagination.search, mode: "insensitive" } },
        { code: { contains: pagination.search, mode: "insensitive" } },
      ];
    }

    const [total, taxes] = await Promise.all([
      prisma.tax.count({ where }),
      prisma.tax.findMany({
        where,
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { productTaxes: true },
          },
        },
      }),
    ]);

    const paginationMeta: PaginationParams = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    };

    return { taxes, pagination: paginationMeta };
  }

  /**
   * Get single tax by ID with its assigned products.
   */
  static async getTaxById(id: string) {
    const tax = await prisma.tax.findUnique({
      where: { id },
      include: {
        productTaxes: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!tax) {
      throw new NotFoundError(`Tax with ID ${id} not found`);
    }

    return tax;
  }

  /**
   * Create a new configurable tax.
   */
  static async createTax(
    data: {
      name: string;
      code: string;
      rateBasisPoints: number;
      isActive?: boolean;
    },
    actorUserId?: string
  ) {
    const existingCode = await prisma.tax.findUnique({
      where: { code: data.code },
    });

    if (existingCode) {
      throw new ConflictError(`Tax with code '${data.code}' already exists`);
    }

    const tax = await prisma.tax.create({
      data: {
        name: data.name,
        code: data.code,
        rateBasisPoints: data.rateBasisPoints,
        isActive: data.isActive ?? true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "CREATE_TAX",
      entityType: "TAX",
      entityId: tax.id,
      beforeData: null,
      afterData: tax,
    });

    return tax;
  }

  /**
   * Update an existing tax.
   */
  static async updateTax(
    id: string,
    data: {
      name?: string;
      code?: string;
      rateBasisPoints?: number;
      isActive?: boolean;
    },
    actorUserId?: string
  ) {
    const currentTax = await this.getTaxById(id);

    if (data.code && data.code !== currentTax.code) {
      const existing = await prisma.tax.findUnique({
        where: { code: data.code },
      });
      if (existing) {
        throw new ConflictError(`Tax with code '${data.code}' already exists`);
      }
    }

    const updated = await prisma.tax.update({
      where: { id },
      data,
    });

    await createAuditLog({
      actorUserId,
      action: "UPDATE_TAX",
      entityType: "TAX",
      entityId: id,
      beforeData: currentTax,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Delete or archive a tax. If products are linked, marks inactive.
   */
  static async deleteTax(id: string, actorUserId?: string) {
    const currentTax = await this.getTaxById(id);

    // If productTaxes exist, mark inactive instead of deleting to maintain integrity
    if (currentTax.productTaxes.length > 0) {
      const updated = await prisma.tax.update({
        where: { id },
        data: { isActive: false },
      });

      await createAuditLog({
        actorUserId,
        action: "DEACTIVATE_TAX",
        entityType: "TAX",
        entityId: id,
        beforeData: currentTax,
        afterData: updated,
      });

      return { tax: updated, deactivated: true };
    }

    await prisma.tax.delete({ where: { id } });

    await createAuditLog({
      actorUserId,
      action: "DELETE_TAX",
      entityType: "TAX",
      entityId: id,
      beforeData: currentTax,
      afterData: null,
    });

    return { tax: currentTax, deleted: true };
  }

  /**
   * Assign taxes to a product.
   */
  static async assignProductTaxes(productId: string, taxIds: string[], actorUserId?: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundError(`Product with ID ${productId} not found`);
    }

    // Verify all taxes exist
    const taxes = await prisma.tax.findMany({
      where: { id: { in: taxIds } },
    });
    if (taxes.length !== taxIds.length) {
      throw new NotFoundError("One or more tax IDs do not exist");
    }

    // Connect taxes in transaction
    await prisma.$transaction(async (tx) => {
      // Remove current product taxes not in new list
      await tx.productTax.deleteMany({
        where: {
          productId,
          taxId: { notIn: taxIds },
        },
      });

      // Add missing ones
      for (const taxId of taxIds) {
        await tx.productTax.upsert({
          where: {
            productId_taxId: { productId, taxId },
          },
          update: {},
          create: { productId, taxId },
        });
      }
    });

    await createAuditLog({
      actorUserId,
      action: "ASSIGN_PRODUCT_TAXES",
      entityType: "PRODUCT",
      entityId: productId,
      afterData: { taxIds },
    });

    return this.getProductTaxes(productId);
  }

  /**
   * Remove a tax assignment from a product.
   */
  static async removeProductTax(productId: string, taxId: string, actorUserId?: string) {
    const existing = await prisma.productTax.findUnique({
      where: {
        productId_taxId: { productId, taxId },
      },
    });

    if (!existing) {
      throw new NotFoundError(`ProductTax assignment not found for product ${productId} and tax ${taxId}`);
    }

    await prisma.productTax.delete({
      where: {
        productId_taxId: { productId, taxId },
      },
    });

    await createAuditLog({
      actorUserId,
      action: "REMOVE_PRODUCT_TAX",
      entityType: "PRODUCT_TAX",
      entityId: existing.id,
      beforeData: existing,
    });

    return { success: true };
  }

  /**
   * Get all taxes assigned to a product.
   */
  static async getProductTaxes(productId: string) {
    const productTaxes = await prisma.productTax.findMany({
      where: { productId },
      include: { tax: true },
    });

    return productTaxes.map((pt) => pt.tax);
  }
}
