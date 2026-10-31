import { prisma } from "../database/prisma";
import {
  ConflictError,
  NotFoundError,
} from "../utils/errors";
import { calculateVariantPrice } from "@sms/shared";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";

export class ProductService {
  /**
   * Contract B: Product pricing snapshot lookup.
   * Calculates final price using integer money arithmetic.
   */
  static async getProductWithVariant(productId: string, variantId?: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: true,
      },
    });

    if (!product || product.isArchived) {
      throw new NotFoundError(`Product ${productId} not found or archived`);
    }

    let variant = null;
    let finalPriceMinor = product.baseSellingPriceMinor;

    if (variantId) {
      variant = product.variants.find((v) => v.id === variantId);
      if (!variant || variant.isArchived) {
        throw new NotFoundError(`Variant ${variantId} not found or archived on product ${productId}`);
      }

      finalPriceMinor = calculateVariantPrice(
        product.baseSellingPriceMinor,
        variant.priceAdjustmentMinor
      );
    }

    return {
      product,
      variant,
      finalPriceMinor: finalPriceMinor.toString(),
      currency: product.currency,
    };
  }

  /**
   * Create a new product with optional initial variants.
   */
  static async createProduct(data: any, actorUserId?: string) {
    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku },
    });
    if (existingSku) {
      throw new ConflictError(`Product with SKU '${data.sku}' already exists`);
    }

    const baseSellingPriceMinor = BigInt(data.baseSellingPriceMinor);
    const costPriceMinor = BigInt(data.costPriceMinor || "0");

    const product = await prisma.product.create({
      data: {
        sku: data.sku.trim(),
        name: data.name.trim(),
        description: data.description || null,
        productType: data.productType || "SERVICE",
        baseSellingPriceMinor,
        costPriceMinor,
        currency: data.currency || "INR",
        notes: data.notes || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isArchived: false,
        variants: data.variants?.length
          ? {
              create: data.variants.map((v: any) => ({
                sku: v.sku.trim(),
                name: v.name.trim(),
                brand: v.brand ? v.brand.trim() : null,
                attribute: v.attribute ? v.attribute.trim() : null,
                priceAdjustmentType: v.priceAdjustmentType || "SURCHARGE",
                priceAdjustmentMinor: BigInt(v.priceAdjustmentMinor || "0"),
                isActive: v.isActive !== undefined ? v.isActive : true,
                isArchived: false,
              })),
            }
          : undefined,
      },
      include: {
        variants: true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "CREATE_PRODUCT",
      entityType: "PRODUCT",
      entityId: product.id,
      afterData: product,
    });

    return product;
  }

  /**
   * List products with pagination, search, and active/archive filtering.
   */
  static async getProducts(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
    includeArchived?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (!params.includeArchived) {
      where.isArchived = false;
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [params.sortBy || "createdAt"]: params.sortOrder || "desc",
        },
        include: {
          variants: {
            where: { isArchived: false },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const pagination: PaginationParams = {
      page,
      pageSize,
      total,
    };

    return { products, pagination };
  }

  /**
   * Get product by ID.
   */
  static async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          where: { isArchived: false },
        },
      },
    });

    if (!product || product.isArchived) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * Update product.
   */
  static async updateProduct(id: string, data: any, actorUserId?: string) {
    const existing = await ProductService.getProductById(id);

    if (data.sku && data.sku !== existing.sku) {
      const duplicateSku = await prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (duplicateSku) {
        throw new ConflictError(`Product SKU '${data.sku}' already in use`);
      }
    }

    const updateData: any = { ...data };
    if (data.baseSellingPriceMinor !== undefined) {
      updateData.baseSellingPriceMinor = BigInt(data.baseSellingPriceMinor);
    }
    if (data.costPriceMinor !== undefined) {
      updateData.costPriceMinor = BigInt(data.costPriceMinor);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { variants: true },
    });

    await createAuditLog({
      actorUserId,
      action: "UPDATE_PRODUCT",
      entityType: "PRODUCT",
      entityId: id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Archive / soft-delete a product.
   */
  static async deleteProduct(id: string, actorUserId?: string) {
    await ProductService.getProductById(id);

    // Check if referenced in historical orders, plans, subscriptions
    const [planItemsCount, subItemsCount, quotItemsCount, invItemsCount] = await Promise.all([
      prisma.planItem.count({ where: { productId: id } }),
      prisma.subscriptionItem.count({ where: { productId: id } }),
      prisma.quotationItem.count({ where: { productId: id } }),
      prisma.invoiceItem.count({ where: { productId: id } }),
    ]);

    const isReferenced = planItemsCount + subItemsCount + quotItemsCount + invItemsCount > 0;

    if (isReferenced) {
      // Soft-delete / archive
      await prisma.product.update({
        where: { id },
        data: {
          isActive: false,
          isArchived: true,
        },
      });

      await createAuditLog({
        actorUserId,
        action: "ARCHIVE_PRODUCT",
        entityType: "PRODUCT",
        entityId: id,
      });

      return { message: "Product referenced by historical records; archived successfully", archived: true };
    } else {
      // Safe to soft-archive or remove
      await prisma.product.update({
        where: { id },
        data: {
          isActive: false,
          isArchived: true,
        },
      });

      await createAuditLog({
        actorUserId,
        action: "ARCHIVE_PRODUCT",
        entityType: "PRODUCT",
        entityId: id,
      });

      return { message: "Product archived successfully", archived: true };
    }
  }

  /**
   * Add variant to an existing product.
   */
  static async addVariant(productId: string, data: any, actorUserId?: string) {
    const product = await ProductService.getProductById(productId);

    const existingSku = await prisma.productVariant.findUnique({
      where: { sku: data.sku },
    });
    if (existingSku) {
      throw new ConflictError(`Variant SKU '${data.sku}' already exists`);
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: data.sku.trim(),
        name: data.name.trim(),
        brand: data.brand ? data.brand.trim() : null,
        attribute: data.attribute ? data.attribute.trim() : null,
        priceAdjustmentType: data.priceAdjustmentType || "SURCHARGE",
        priceAdjustmentMinor: BigInt(data.priceAdjustmentMinor || "0"),
        isActive: data.isActive !== undefined ? data.isActive : true,
        isArchived: false,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "CREATE_VARIANT",
      entityType: "PRODUCT_VARIANT",
      entityId: variant.id,
      afterData: variant,
    });

    return variant;
  }

  /**
   * Update variant.
   */
  static async updateVariant(
    productId: string,
    variantId: string,
    data: any,
    actorUserId?: string
  ) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId, isArchived: false },
    });

    if (!variant) {
      throw new NotFoundError(`Variant ${variantId} not found on product ${productId}`);
    }

    if (data.sku && data.sku !== variant.sku) {
      const existingSku = await prisma.productVariant.findUnique({
        where: { sku: data.sku },
      });
      if (existingSku) {
        throw new ConflictError(`Variant SKU '${data.sku}' already in use`);
      }
    }

    const updateData: any = { ...data };
    if (data.priceAdjustmentMinor !== undefined) {
      updateData.priceAdjustmentMinor = BigInt(data.priceAdjustmentMinor);
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: updateData,
    });

    await createAuditLog({
      actorUserId,
      action: "UPDATE_VARIANT",
      entityType: "PRODUCT_VARIANT",
      entityId: variantId,
      beforeData: variant,
      afterData: updated,
    });

    return updated;
  }
}
