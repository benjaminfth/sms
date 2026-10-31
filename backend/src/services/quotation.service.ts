import { prisma } from "../database/prisma";
import { QuotationStatus, Role } from "@sms/shared";
import { SequenceService } from "../utils/sequence.service";
import { PricingCalculationService } from "./pricing-calculation.service";
import { getProductWithVariant, createAuditLog } from "./contracts";
import {
  NotFoundError,
  BusinessRuleError,
  ForbiddenError,
} from "../utils/errors";
import { PaginationParams } from "../utils/response";

export interface CreateQuotationItemInput {
  productId: string;
  productVariantId?: string | null;
  description?: string | null;
  quantity?: string | number;
  unitPriceMinor?: string | bigint | number;
}

export interface CreateQuotationInput {
  customerId: string;
  templateId?: string | null;
  currency?: string;
  validUntil: string;
  notes?: string | null;
  discountCode?: string | null;
  items: CreateQuotationItemInput[];
}

export interface UpdateQuotationInput {
  templateId?: string | null;
  validUntil?: string;
  notes?: string | null;
  discountCode?: string | null;
  items?: CreateQuotationItemInput[];
}

export class QuotationService {
  /**
   * Creates a new quotation in DRAFT status.
   */
  static async createQuotation(
    data: CreateQuotationInput,
    actorUserId?: string | null
  ) {
    // 1. Validate customer existence
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    // 2. Prepare line items with resolved unit prices and descriptions
    const preparedItems = [];
    for (const item of data.items) {
      const { product, variant, finalPriceMinor } = await getProductWithVariant(
        item.productId,
        item.productVariantId || undefined
      );

      const unitPriceMinor = item.unitPriceMinor !== undefined
        ? BigInt(String(item.unitPriceMinor))
        : BigInt(finalPriceMinor);

      const description =
        item.description ||
        (variant ? `${product.name} - ${variant.name}` : product.name);

      preparedItems.push({
        productId: product.id,
        productVariantId: variant?.id || null,
        description,
        quantity: item.quantity ? String(item.quantity) : "1.000",
        unitPriceMinor,
      });
    }

    // 3. Calculate quotation totals
    const calculation = await PricingCalculationService.calculateTotals({
      customerId: data.customerId,
      currency: data.currency || customer.currency || "INR",
      items: preparedItems,
      discountCode: data.discountCode,
    });

    // 4. Generate unique quotation number
    const quotationNumber = await SequenceService.getNextNumber("QUO");

    // 5. Transactional insert
    const quotation = await prisma.$transaction(async (tx) => {
      const created = await tx.quotation.create({
        data: {
          quotationNumber,
          customerId: data.customerId,
          templateId: data.templateId || null,
          status: QuotationStatus.DRAFT,
          totalAmountMinor: calculation.totalAmountMinor,
          currency: data.currency || customer.currency || "INR",
          validUntil: new Date(data.validUntil),
          notes: data.notes || null,
          items: {
            create: calculation.items.map((it) => ({
              productId: it.productId!,
              productVariantId: it.productVariantId || null,
              description: it.description,
              quantity: it.quantity,
              unitPriceMinor: it.unitPriceMinor,
              totalAmountMinor: it.totalAmountMinor,
            })),
          },
        },
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

      // Link discount if applied
      if (calculation.appliedDiscount) {
        await tx.discountApplication.create({
          data: {
            discountId: calculation.appliedDiscount.id,
            quotationId: created.id,
            amountDeductedMinor: calculation.appliedDiscount.amountMinor,
          },
        });
      }

      return created;
    });

    // Audit log
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
   * Retrieves a paginated list of quotations.
   */
  static async getQuotations(
    query: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: QuotationStatus;
      customerId?: string;
    },
    _currentUserRole?: Role,
    _currentCustomerUserId?: string
  ) {
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
        { quotationNumber: { contains: query.search, mode: "insensitive" } },
        { customer: { fullName: { contains: query.search, mode: "insensitive" } } },
        { customer: { companyName: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
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
      }),
      prisma.quotation.count({ where }),
    ]);

    const pagination: PaginationParams = { page, pageSize, total };
    return { quotations, pagination };
  }

  /**
   * Retrieves a single quotation by ID with its items and relations.
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
        discountApplications: {
          include: {
            discount: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundError("Quotation not found");
    }

    return quotation;
  }

  /**
   * Updates an existing quotation. Allowed only when status is DRAFT.
   */
  static async updateQuotation(
    id: string,
    data: UpdateQuotationInput,
    actorUserId?: string | null
  ) {
    const existing = await this.getQuotationById(id);
    if (existing.status !== QuotationStatus.DRAFT) {
      throw new BusinessRuleError(
        `Cannot edit quotation with status ${existing.status}. Only DRAFT quotations can be modified.`
      );
    }

    let totalAmountMinor = existing.totalAmountMinor;
    let preparedItems: any[] | null = null;

    if (data.items && data.items.length > 0) {
      preparedItems = [];
      for (const item of data.items) {
        const { product, variant, finalPriceMinor } = await getProductWithVariant(
          item.productId,
          item.productVariantId || undefined
        );

        const unitPriceMinor = item.unitPriceMinor !== undefined
          ? BigInt(String(item.unitPriceMinor))
          : BigInt(finalPriceMinor);

        const description =
          item.description ||
          (variant ? `${product.name} - ${variant.name}` : product.name);

        preparedItems.push({
          productId: product.id,
          productVariantId: variant?.id || null,
          description,
          quantity: item.quantity ? String(item.quantity) : "1.000",
          unitPriceMinor,
        });
      }

      const calculation = await PricingCalculationService.calculateTotals({
        customerId: existing.customerId,
        currency: existing.currency,
        items: preparedItems,
        discountCode: data.discountCode,
      });

      totalAmountMinor = calculation.totalAmountMinor;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (preparedItems) {
        await tx.quotationItem.deleteMany({
          where: { quotationId: id },
        });

        await tx.quotationItem.createMany({
          data: preparedItems.map((it) => ({
            quotationId: id,
            productId: it.productId,
            productVariantId: it.productVariantId,
            description: it.description,
            quantity: it.quantity,
            unitPriceMinor: it.unitPriceMinor,
            totalAmountMinor:
              (it.unitPriceMinor * BigInt(Math.round(parseFloat(it.quantity) * 1000))) / 1000n,
          })),
        });
      }

      return tx.quotation.update({
        where: { id },
        data: {
          templateId: data.templateId !== undefined ? data.templateId : existing.templateId,
          validUntil: data.validUntil ? new Date(data.validUntil) : existing.validUntil,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          totalAmountMinor,
        },
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
  }

  /**
   * Transitions quotation: DRAFT -> SENT
   */
  static async sendQuotation(id: string, actorUserId?: string | null) {
    const quotation = await this.getQuotationById(id);
    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BusinessRuleError(
        `Quotation cannot be sent. Current status is ${quotation.status}. Only DRAFT quotations can be sent.`
      );
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.SENT },
      include: {
        customer: true,
        template: true,
        items: true,
        subscription: true,
      },
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
   * Transitions quotation: SENT -> ACCEPTED
   */
  static async acceptQuotation(
    id: string,
    actorUserId?: string | null,
    actorRole?: Role,
    actorCustomerId?: string
  ) {
    const quotation = await this.getQuotationById(id);

    // If Customer is accepting, verify ownership
    if (actorRole === Role.CUSTOMER && actorCustomerId !== quotation.customerId) {
      throw new ForbiddenError("Cannot accept a quotation belonging to another customer");
    }

    if (quotation.status !== QuotationStatus.SENT) {
      throw new BusinessRuleError(
        `Quotation cannot be accepted. Current status is ${quotation.status}. Only SENT quotations can be accepted.`
      );
    }

    // Check validity date
    if (new Date() > quotation.validUntil) {
      // Mark as expired
      await prisma.quotation.update({
        where: { id },
        data: { status: QuotationStatus.EXPIRED },
      });
      throw new BusinessRuleError("Cannot accept an expired quotation");
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.ACCEPTED },
      include: {
        customer: true,
        template: true,
        items: true,
        subscription: true,
      },
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
   * Transitions quotation: SENT -> REJECTED
   */
  static async rejectQuotation(
    id: string,
    reason?: string | null,
    actorUserId?: string | null,
    actorRole?: Role,
    actorCustomerId?: string
  ) {
    const quotation = await this.getQuotationById(id);

    if (actorRole === Role.CUSTOMER && actorCustomerId !== quotation.customerId) {
      throw new ForbiddenError("Cannot reject a quotation belonging to another customer");
    }

    if (quotation.status !== QuotationStatus.SENT) {
      throw new BusinessRuleError(
        `Quotation cannot be rejected. Current status is ${quotation.status}. Only SENT quotations can be rejected.`
      );
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.REJECTED,
        notes: reason
          ? `${quotation.notes ? quotation.notes + "\n" : ""}Rejection Reason: ${reason}`
          : quotation.notes,
      },
      include: {
        customer: true,
        template: true,
        items: true,
        subscription: true,
      },
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
   * Transitions quotation to EXPIRED
   */
  static async expireQuotation(id: string, actorUserId?: string | null) {
    const quotation = await this.getQuotationById(id);

    if (
      quotation.status === QuotationStatus.ACCEPTED ||
      quotation.status === QuotationStatus.REJECTED ||
      quotation.status === QuotationStatus.EXPIRED
    ) {
      throw new BusinessRuleError(
        `Quotation cannot be expired from current status: ${quotation.status}`
      );
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.EXPIRED },
      include: {
        customer: true,
        template: true,
        items: true,
        subscription: true,
      },
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
}
