import { prisma } from "../database/prisma";
import { InvoiceStatus } from "@sms/shared";
import { BusinessRuleError, NotFoundError } from "../utils/errors";
import { SequenceService } from "./sequence.service";
import { FinancialCalculatorService, LineItemCalculationInput } from "./financial-calculator.service";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";

export interface CreateInvoiceInput {
  customerId: string;
  subscriptionId?: string | null;
  billingPeriodStart?: Date | string | null;
  billingPeriodEnd?: Date | string | null;
  dueDate: Date | string;
  currency?: string;
  items: LineItemCalculationInput[];
  discountCode?: string | null;
}

export class InvoiceService {
  /**
   * Create an invoice with historical commercial snapshots, tax breakdown, and integer minor units.
   */
  static async createInvoice(data: CreateInvoiceInput, actorUserId?: string, externalTx?: any) {
    if (!data.items || data.items.length === 0) {
      throw new BusinessRuleError("An invoice must contain at least one line item");
    }

    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw new NotFoundError(`Customer with ID '${data.customerId}' not found`);
    }

    const dueDate = new Date(data.dueDate);
    if (isNaN(dueDate.getTime())) {
      throw new BusinessRuleError("Invalid due date");
    }

    const periodStart = data.billingPeriodStart ? new Date(data.billingPeriodStart) : null;
    const periodEnd = data.billingPeriodEnd ? new Date(data.billingPeriodEnd) : null;

    // Calculate totals and taxes using Developer 3 calculation interface
    const calc = await FinancialCalculatorService.calculateTotals({
      items: data.items,
      customerId: data.customerId,
      discountCode: data.discountCode,
      currency: data.currency || customer.currency || "INR",
    });

    const invoiceNumber = await SequenceService.getNextNumber("INV");
    const currency = data.currency || customer.currency || "INR";

    const executeOperation = async (tx: any) => {
      // 1. Idempotency check if associated with a subscription billing period
      if (data.subscriptionId && periodStart && periodEnd) {
        const existingInvoice = await tx.invoice.findFirst({
          where: {
            subscriptionId: data.subscriptionId,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
          },
          include: {
            items: true,
            customer: true,
          },
        });

        if (existingInvoice) {
          return { invoice: existingInvoice, isDuplicate: true };
        }
      }

      // 2. Create the invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: data.customerId,
          subscriptionId: data.subscriptionId || null,
          status: InvoiceStatus.ISSUED,
          currency,
          subtotalMinor: calc.subtotalMinor,
          taxAmountMinor: calc.taxAmountMinor,
          discountAmountMinor: calc.discountAmountMinor,
          totalAmountMinor: calc.totalAmountMinor,
          amountPaidMinor: 0n,
          balanceDueMinor: calc.totalAmountMinor,
          dueDate,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          issuedAt: new Date(),
          items: {
            create: calc.items.map((item) => ({
              productId: item.productId || null,
              description: item.description,
              quantity: item.quantity,
              unitPriceMinor: item.unitPriceMinor,
              taxAmountMinor: item.taxAmountMinor,
              totalAmountMinor: item.totalAmountMinor,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          subscription: true,
        },
      });

      // 3. Link discount application if discount was applied
      if (calc.appliedDiscount) {
        await tx.discountApplication.create({
          data: {
            discountId: calc.appliedDiscount.discountId,
            invoiceId: invoice.id,
            amountDeductedMinor: calc.appliedDiscount.amountDeductedMinor,
          },
        });

        // Increment discount redemption
        await tx.discount.update({
          where: { id: calc.appliedDiscount.discountId },
          data: { currentRedemptions: { increment: 1 } },
        });
      }

      return { invoice, isDuplicate: false };
    };

    const result = externalTx
      ? await executeOperation(externalTx)
      : await prisma.$transaction(executeOperation);

    if (!result.isDuplicate) {
      await createAuditLog({
        actorUserId,
        action: "CREATE_INVOICE",
        entityType: "INVOICE",
        entityId: result.invoice.id,
        afterData: result.invoice,
      });
    }

    return result;
  }

  /**
   * List invoices with pagination and filters.
   */
  static async listInvoices(params: {
    page?: number;
    pageSize?: number;
    customerId?: string;
    subscriptionId?: string;
    status?: InvoiceStatus;
    search?: string;
  }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.customerId) {
      where.customerId = params.customerId;
    }
    if (params.subscriptionId) {
      where.subscriptionId = params.subscriptionId;
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.search) {
      where.OR = [
        { invoiceNumber: { contains: params.search, mode: "insensitive" } },
        { customer: { fullName: { contains: params.search, mode: "insensitive" } } },
        { customer: { companyName: { contains: params.search, mode: "insensitive" } } },
      ];
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          subscription: {
            select: {
              id: true,
              subscriptionNumber: true,
              billingInterval: true,
            },
          },
          _count: {
            select: {
              items: true,
              paymentAllocations: true,
            },
          },
        },
      }),
    ]);

    const pagination: PaginationParams = {
      page,
      pageSize,
      total,
    };

    return { invoices, pagination };
  }

  /**
   * Retrieve single invoice with line items, payments, customer, and subscription.
   */
  static async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: true,
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
      throw new NotFoundError(`Invoice with ID '${id}' not found`);
    }

    return invoice;
  }

  /**
   * Void an issued or overdue invoice.
   * Strictly prevents voiding if payments have already been applied.
   */
  static async voidInvoice(id: string, reason?: string, actorUserId?: string) {
    const invoice = await InvoiceService.getInvoiceById(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BusinessRuleError("Cannot void an already paid invoice");
    }

    if (invoice.amountPaidMinor > 0n || invoice.paymentAllocations.length > 0) {
      throw new BusinessRuleError("Cannot void an invoice with allocated payments. Reconcile or refund payments first.");
    }

    if (invoice.status === InvoiceStatus.VOID) {
      return invoice;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.VOID,
      },
      include: {
        items: true,
        customer: true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "VOID_INVOICE",
      entityType: "INVOICE",
      entityId: id,
      beforeData: invoice,
      afterData: { ...updated, voidReason: reason },
    });

    return updated;
  }

  /**
   * Developer 3 Integration Interface:
   * Called by Payment module when a payment allocation is applied to an invoice.
   */
  static async recordPaymentAllocation(
    invoiceId: string,
    allocatedAmountMinor: bigint,
    tx?: any
  ) {
    const client = tx || prisma;
    const invoice = await client.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new NotFoundError(`Invoice ${invoiceId} not found`);
    }

    const newAmountPaid = invoice.amountPaidMinor + allocatedAmountMinor;
    const newBalanceDue = invoice.totalAmountMinor - newAmountPaid;

    let newStatus = invoice.status;
    let paidAt = invoice.paidAt;

    if (newBalanceDue <= 0n) {
      newStatus = InvoiceStatus.PAID;
      paidAt = new Date();
    } else if (newAmountPaid > 0n) {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    }

    return client.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaidMinor: newAmountPaid,
        balanceDueMinor: newBalanceDue < 0n ? 0n : newBalanceDue,
        status: newStatus,
        paidAt,
      },
    });
  }
}
