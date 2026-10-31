import { prisma } from "../database/prisma";
import {
  QuotationStatus,
  Role,
  PaymentTerms,
} from "@sms/shared";
import { SequenceService } from "../utils/sequence.service";
import { PricingCalculationService } from "./pricing-calculation.service";
import { getProductWithVariant, createAuditLog } from "./contracts";
import { QuotationTemplateService } from "./quotation-template.service";
import {
  NotFoundError,
  BusinessRuleError,
  ForbiddenError,
} from "../utils/errors";
import { PaginationParams } from "../utils/response";

export interface CreateQuotationItemInput {
  productId?: string;
  productVariantId?: string | null;
  planId?: string | null;
  description?: string | null;
  quantity?: string | number;
  unitPriceMinor?: string | bigint | number;
}

export interface CreateQuotationInput {
  customerId: string;
  templateId?: string | null;
  currency?: string;
  validUntil?: string;
  paymentTerms?: PaymentTerms;
  notes?: string | null;
  discountCode?: string | null;
  items?: CreateQuotationItemInput[];
}

export interface UpdateQuotationInput {
  templateId?: string | null;
  validUntil?: string;
  paymentTerms?: PaymentTerms;
  notes?: string | null;
  discountCode?: string | null;
  items?: CreateQuotationItemInput[];
}

export class QuotationService {
  /**
   * Creates a new quotation in DRAFT status.
   * Auto-populates lines, validity duration, and payment terms from template when selected.
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

    let templateConfig: any = null;
    let templateTerms = "";
    let templateValidityDays = 15;
    let templatePaymentTerms: PaymentTerms = "NET_15";

    // 2. Resolve template configuration if templateId is provided
    if (data.templateId) {
      const template = await QuotationTemplateService.getTemplateById(data.templateId);
      templateConfig = template.config;
      templateValidityDays = templateConfig?.validityDays ?? 15;
      templatePaymentTerms = templateConfig?.paymentTerms ?? "NET_15";
      templateTerms = templateConfig?.termsAndConditions || "";
    }

    // 3. Determine items to quote (use provided items or fallback to template lines)
    let rawItems: CreateQuotationItemInput[] = (data.items && data.items.length > 0)
      ? data.items
      : [];

    if (rawItems.length === 0 && templateConfig?.lines && templateConfig.lines.length > 0) {
      for (const line of templateConfig.lines) {
        if (line.productId) {
          rawItems.push({
            productId: line.productId,
            productVariantId: line.productVariantId,
            description: line.description,
            quantity: line.quantity || "1.000",
            unitPriceMinor: line.unitPriceMinor,
          });
        } else if (line.planId) {
          // If template line references a plan, resolve all items in that plan
          const plan = await prisma.plan.findUnique({
            where: { id: line.planId },
            include: { items: true },
          });
          if (plan && plan.items.length > 0) {
            for (const pItem of plan.items) {
              rawItems.push({
                productId: pItem.productId,
                productVariantId: pItem.productVariantId,
                quantity: pItem.quantity ? String(pItem.quantity) : "1.000",
              });
            }
          }
        }
      }
    }

    if (rawItems.length === 0) {
      throw new BusinessRuleError("Quotation must have at least one line item");
    }

    // 4. Prepare line items with resolved unit prices and descriptions
    const preparedItems = [];
    for (const item of rawItems) {
      if (!item.productId) {
        throw new BusinessRuleError("Product ID is required for all quotation items");
      }

      const { product, variant, finalPriceMinor } = await getProductWithVariant(
        item.productId,
        item.productVariantId || undefined
      );

      const unitPriceMinor =
        item.unitPriceMinor !== undefined && item.unitPriceMinor !== null
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

    // 5. Calculate quotation totals
    const calculation = await PricingCalculationService.calculateTotals({
      customerId: data.customerId,
      currency: data.currency || customer.currency || "INR",
      items: preparedItems,
      discountCode: data.discountCode,
    });

    // 6. Generate unique quotation number
    const quotationNumber = await SequenceService.getNextNumber("QUO");

    // 7. Calculate validity date: if not explicitly provided, calculate from template validity duration
    let validUntilDate: Date;
    if (data.validUntil) {
      validUntilDate = new Date(data.validUntil);
    } else {
      validUntilDate = new Date();
      validUntilDate.setUTCDate(validUntilDate.getUTCDate() + templateValidityDays);
    }

    // 8. Prepare notes including terms and payment terms
    const paymentTerms = data.paymentTerms || templatePaymentTerms;
    let notes = data.notes;
    if (!notes && templateTerms) {
      notes = templateTerms;
    }
    if (paymentTerms) {
      notes = notes ? `${notes}\n[Payment Terms: ${paymentTerms}]` : `[Payment Terms: ${paymentTerms}]`;
    }

    // 9. Transactional insert
    const quotation = await prisma.$transaction(async (tx) => {
      const created = await tx.quotation.create({
        data: {
          quotationNumber,
          customerId: data.customerId,
          templateId: data.templateId || null,
          status: QuotationStatus.DRAFT,
          totalAmountMinor: calculation.totalAmountMinor,
          currency: data.currency || customer.currency || "INR",
          validUntil: validUntilDate,
          notes: notes || null,
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

    // 10. Audit Log
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
   * Retrieves paginated quotations.
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
   * Retrieves a single quotation with its line items.
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
   * Updates an existing quotation. Only allowed in DRAFT status.
   */
  static async updateQuotation(
    id: string,
    data: UpdateQuotationInput,
    actorUserId?: string | null
  ) {
    const existing = await this.getQuotationById(id);

    if (existing.status !== QuotationStatus.DRAFT) {
      throw new BusinessRuleError(
        `Quotation cannot be edited in ${existing.status} status. Only DRAFT quotations can be edited.`
      );
    }

    let totalAmountMinor = existing.totalAmountMinor;

    const updated = await prisma.$transaction(async (tx) => {
      // If items are being replaced, recalculate totals
      let calculation: any = null;
      if (data.items && data.items.length > 0) {
        const preparedItems = [];
        for (const item of data.items) {
          if (!item.productId) {
            throw new BusinessRuleError("Product ID is required for all quotation items");
          }
          const { product, variant, finalPriceMinor } = await getProductWithVariant(
            item.productId,
            item.productVariantId || undefined
          );

          const unitPriceMinor =
            item.unitPriceMinor !== undefined && item.unitPriceMinor !== null
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

        calculation = await PricingCalculationService.calculateTotals({
          customerId: existing.customerId,
          currency: existing.currency,
          items: preparedItems,
          discountCode: data.discountCode,
        });

        totalAmountMinor = calculation.totalAmountMinor;

        // Delete existing items
        await tx.quotationItem.deleteMany({
          where: { quotationId: id },
        });

        // Insert new items
        await tx.quotationItem.createMany({
          data: calculation.items.map((it: any) => ({
            quotationId: id,
            productId: it.productId!,
            productVariantId: it.productVariantId || null,
            description: it.description,
            quantity: it.quantity,
            unitPriceMinor: it.unitPriceMinor,
            totalAmountMinor: it.totalAmountMinor,
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

    if (actorRole === Role.CUSTOMER && actorCustomerId !== quotation.customerId) {
      throw new ForbiddenError("Cannot accept a quotation belonging to another customer");
    }

    if (quotation.status !== QuotationStatus.SENT) {
      throw new BusinessRuleError(
        `Quotation cannot be accepted. Current status is ${quotation.status}. Only SENT quotations can be accepted.`
      );
    }

    // Check if quotation has expired
    if (new Date() > quotation.validUntil) {
      await prisma.quotation.update({
        where: { id },
        data: { status: QuotationStatus.EXPIRED },
      });
      throw new BusinessRuleError("Quotation has expired and cannot be accepted");
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
