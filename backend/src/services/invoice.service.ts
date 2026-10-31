import { prisma } from "../database/prisma";
import { InvoiceStatus } from "@sms/shared";
import { SequenceService } from "../utils/sequence.service";
import { PricingCalculationService } from "./pricing-calculation.service";
import { createAuditLog } from "./contracts";
import {
  NotFoundError,
  BusinessRuleError,
} from "../utils/errors";
import { PaginationParams } from "../utils/response";

export interface CreateInvoiceItemInput {
  productId?: string | null;
  description: string;
  quantity?: string | number;
  unitPriceMinor: string | bigint | number;
  taxAmountMinor?: string | bigint | number;
}

export interface CreateInvoiceInput {
  customerId: string;
  subscriptionId?: string | null;
  currency?: string;
  dueDate: string;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  items: CreateInvoiceItemInput[];
  discountCode?: string | null;
}

export class InvoiceService {
  /**
   * Generates a new invoice with frozen line item snapshots.
   */
  static async createInvoice(
    data: CreateInvoiceInput,
    actorUserId?: string | null
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    // 1. Calculate line items, tax, and discount breakdown
    const calculation = await PricingCalculationService.calculateTotals({
      customerId: data.customerId,
      currency: data.currency || customer.currency || "INR",
      items: data.items.map((it) => ({
        productId: it.productId || null,
        description: it.description,
        quantity: it.quantity ? String(it.quantity) : "1.000",
        unitPriceMinor: it.unitPriceMinor,
      })),
      discountCode: data.discountCode,
      billingPeriodStart: data.billingPeriodStart ? new Date(data.billingPeriodStart) : null,
      billingPeriodEnd: data.billingPeriodEnd ? new Date(data.billingPeriodEnd) : null,
    });

    // 2. Generate concurrency-safe sequential invoice number
    const invoiceNumber = await SequenceService.getNextNumber("INV");

    // 3. Create invoice inside transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: data.customerId,
          subscriptionId: data.subscriptionId || null,
          status: InvoiceStatus.ISSUED,
          currency: data.currency || customer.currency || "INR",
          subtotalMinor: calculation.subtotalMinor,
          taxAmountMinor: calculation.taxAmountMinor,
          discountAmountMinor: calculation.discountAmountMinor,
          totalAmountMinor: calculation.totalAmountMinor,
          amountPaidMinor: 0n,
          balanceDueMinor: calculation.totalAmountMinor,
          dueDate: new Date(data.dueDate),
          billingPeriodStart: data.billingPeriodStart ? new Date(data.billingPeriodStart) : null,
          billingPeriodEnd: data.billingPeriodEnd ? new Date(data.billingPeriodEnd) : null,
          issuedAt: new Date(),
          items: {
            create: calculation.items.map((it) => ({
              productId: it.productId,
              description: it.description,
              quantity: it.quantity,
              unitPriceMinor: it.unitPriceMinor,
              taxAmountMinor: it.taxAmountMinor,
              totalAmountMinor: it.totalAmountMinor,
            })),
          },
        },
        include: {
          customer: true,
          subscription: true,
          items: {
            include: {
              product: true,
            },
          },
          paymentAllocations: true,
        },
      });

      if (calculation.appliedDiscount) {
        await tx.discountApplication.create({
          data: {
            discountId: calculation.appliedDiscount.id,
            invoiceId: created.id,
            amountDeductedMinor: calculation.appliedDiscount.amountMinor,
          },
        });
      }

      return created;
    });

    await createAuditLog({
      actorUserId,
      action: "CREATE_INVOICE",
      entityType: "INVOICE",
      entityId: invoice.id,
      afterData: invoice,
    });

    return invoice;
  }

  /**
   * Retrieves paginated invoices with search and filters.
   */
  static async getInvoices(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: InvoiceStatus;
    customerId?: string;
    subscriptionId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.subscriptionId) {
      where.subscriptionId = query.subscriptionId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search, mode: "insensitive" } },
        { customer: { fullName: { contains: query.search, mode: "insensitive" } } },
        { customer: { companyName: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          subscription: true,
          items: true,
          paymentAllocations: true,
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    const pagination: PaginationParams = { page, pageSize, total };
    return { invoices, pagination };
  }

  /**
   * Retrieves a single invoice with all details, line items, and payment allocations.
   */
  static async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: {
          include: {
            plan: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        paymentAllocations: {
          include: {
            payment: true,
          },
        },
        discountApplications: {
          include: {
            discount: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    return invoice;
  }

  /**
   * Voids an unpaid invoice. Paid invoices cannot be voided.
   */
  static async voidInvoice(
    id: string,
    _reason?: string | null,
    actorUserId?: string | null
  ) {
    const invoice = await this.getInvoiceById(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BusinessRuleError("Cannot void an invoice that has already been paid");
    }

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BusinessRuleError("Invoice is already void");
    }

    if (invoice.amountPaidMinor > 0n) {
      throw new BusinessRuleError("Cannot void an invoice with recorded payments. Reverse payments first.");
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.VOID,
      },
      include: {
        customer: true,
        items: true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "VOID_INVOICE",
      entityType: "INVOICE",
      entityId: id,
      beforeData: invoice,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Developer 3 Integration Point:
   * Called by Developer 3's payment allocation module to record payments against an invoice.
   */
  static async recordPaymentAllocation(
    invoiceId: string,
    allocatedAmountMinor: bigint
  ) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw new NotFoundError("Invoice not found");
      }

      if (invoice.status === InvoiceStatus.VOID) {
        throw new BusinessRuleError("Cannot allocate payment to a voided invoice");
      }

      const newAmountPaidMinor = invoice.amountPaidMinor + allocatedAmountMinor;
      let newBalanceDueMinor = invoice.totalAmountMinor - newAmountPaidMinor;
      if (newBalanceDueMinor < 0n) {
        newBalanceDueMinor = 0n;
      }

      let newStatus = invoice.status;
      let paidAt = invoice.paidAt;

      if (newBalanceDueMinor === 0n && newAmountPaidMinor >= invoice.totalAmountMinor) {
        newStatus = InvoiceStatus.PAID;
        paidAt = new Date();
      } else if (newAmountPaidMinor > 0n) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaidMinor: newAmountPaidMinor,
          balanceDueMinor: newBalanceDueMinor,
          status: newStatus,
          paidAt,
        },
        include: {
          customer: true,
          items: true,
          paymentAllocations: true,
        },
      });
    });
  }
}
