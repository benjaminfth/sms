import { prisma } from "../database/prisma";
import {
  PaymentStatus,
  PaymentMethod,
  InvoiceStatus,
} from "@sms/shared";
import {
  NotFoundError,
  ConflictError,
  BusinessRuleError,
} from "../utils/errors";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";
import { InvoiceSettlementService } from "./invoice-settlement.service";
import crypto from "crypto";

export class PaymentService {
  /**
   * Record a payment (manual offline or processed via gateway).
   * If invoiceId is provided, safely allocates the payment to the invoice.
   */
  static async recordPayment(
    data: {
      customerId: string;
      amountMinor: string | bigint;
      currency?: string;
      paymentMethod: PaymentMethod;
      status?: PaymentStatus;
      notes?: string | null;
      paymentReference?: string;
      invoiceId?: string | null;
      allocatedAmountMinor?: string | bigint;
    },
    actorUserId?: string
  ) {
    const amountMinor = BigInt(data.amountMinor);
    if (amountMinor <= 0n) {
      throw new BusinessRuleError("Payment amount must be greater than zero");
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw new NotFoundError(`Customer with ID ${data.customerId} not found`);
    }

    // Generate reference if not supplied
    let reference = data.paymentReference?.trim();
    if (!reference) {
      const hex = crypto.randomBytes(3).toString("hex").toUpperCase();
      reference = `PAY-${Date.now().toString().slice(-6)}-${hex}`;
    }

    // Check unique reference
    const existingRef = await prisma.payment.findUnique({
      where: { paymentReference: reference },
    });
    if (existingRef) {
      throw new ConflictError(
        `Payment with transaction reference '${reference}' already exists`
      );
    }

    const status = data.status || PaymentStatus.COMPLETED;

    return prisma.$transaction(async (tx) => {
      // 1. Create payment record
      const payment = await tx.payment.create({
        data: {
          paymentReference: reference!,
          customerId: data.customerId,
          amountMinor,
          currency: data.currency || customer.currency || "INR",
          paymentMethod: data.paymentMethod,
          status,
          notes: data.notes || null,
          paidAt: new Date(),
        },
      });

      // 2. If invoiceId is provided and payment is COMPLETED, auto-allocate
      let allocation = null;
      let updatedInvoice = null;

      if (data.invoiceId && status === PaymentStatus.COMPLETED) {
        const invoice = await tx.invoice.findUnique({
          where: { id: data.invoiceId },
        });

        if (!invoice) {
          throw new NotFoundError(`Invoice ${data.invoiceId} not found`);
        }

        if (invoice.customerId !== data.customerId) {
          throw new BusinessRuleError(
            `Invoice ${invoice.invoiceNumber} does not belong to customer ${data.customerId}`
          );
        }

        if (
          invoice.status === InvoiceStatus.VOID ||
          invoice.status === InvoiceStatus.CANCELLED
        ) {
          throw new BusinessRuleError(
            `Cannot allocate payment to a ${invoice.status} invoice`
          );
        }

        // Amount to allocate: min(amountMinor, invoice.balanceDueMinor) or specific amount
        let allocAmount = data.allocatedAmountMinor
          ? BigInt(data.allocatedAmountMinor)
          : amountMinor;

        if (allocAmount > amountMinor) {
          allocAmount = amountMinor;
        }

        if (allocAmount > invoice.balanceDueMinor) {
          allocAmount = invoice.balanceDueMinor;
        }

        if (allocAmount > 0n) {
          allocation = await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              invoiceId: invoice.id,
              allocatedAmountMinor: allocAmount,
            },
          });

          // Update invoice state
          updatedInvoice = await InvoiceSettlementService.updateInvoiceSettlement(
            invoice.id,
            tx
          );
        }
      }

      await createAuditLog({
        actorUserId,
        action: "RECORD_PAYMENT",
        entityType: "PAYMENT",
        entityId: payment.id,
        afterData: {
          payment,
          allocation,
          updatedInvoice,
        },
      });

      const fullPayment = await tx.payment.findUnique({
        where: { id: payment.id },
        include: {
          customer: true,
          allocations: {
            include: {
              invoice: true,
            },
          },
        },
      });

      return fullPayment;
    });
  }

  /**
   * List payments with filtering and pagination.
   */
  static async getPayments(pagination: {
    page: number;
    pageSize: number;
    customerId?: string;
    status?: PaymentStatus;
    paymentMethod?: PaymentMethod;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};

    if (pagination.customerId) {
      where.customerId = pagination.customerId;
    }

    if (pagination.status) {
      where.status = pagination.status;
    }

    if (pagination.paymentMethod) {
      where.paymentMethod = pagination.paymentMethod;
    }

    if (pagination.search) {
      where.OR = [
        { paymentReference: { contains: pagination.search, mode: "insensitive" } },
        { customer: { fullName: { contains: pagination.search, mode: "insensitive" } } },
        { customer: { companyName: { contains: pagination.search, mode: "insensitive" } } },
      ];
    }

    if (pagination.startDate || pagination.endDate) {
      where.paidAt = {};
      if (pagination.startDate) where.paidAt.gte = new Date(pagination.startDate);
      if (pagination.endDate) where.paidAt.lte = new Date(pagination.endDate);
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        orderBy: { paidAt: "desc" },
        include: {
          customer: {
            select: { id: true, fullName: true, companyName: true, email: true },
          },
          allocations: {
            include: {
              invoice: {
                select: { id: true, invoiceNumber: true, totalAmountMinor: true, balanceDueMinor: true },
              },
            },
          },
        },
      }),
    ]);

    const paginationMeta: PaginationParams = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    };

    return { payments, pagination: paginationMeta };
  }

  /**
   * Get single payment by ID with allocations and linked invoice details.
   */
  static async getPaymentById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        allocations: {
          include: {
            invoice: {
              include: {
                items: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError(`Payment with ID ${id} not found`);
    }

    const totalAllocated = payment.allocations.reduce(
      (sum, a) => sum + a.allocatedAmountMinor,
      0n
    );
    const unallocatedAmountMinor =
      payment.amountMinor > totalAllocated ? payment.amountMinor - totalAllocated : 0n;

    return {
      ...payment,
      unallocatedAmountMinor,
    };
  }

  /**
   * Manual payment verification (for changing status if verified by Admin/Staff with audit log).
   */
  static async verifyPayment(
    id: string,
    status: PaymentStatus,
    notes?: string,
    actorUserId?: string
  ) {
    const currentPayment = await this.getPaymentById(id);

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status,
        notes: notes ? `${currentPayment.notes || ""}\n[Verified]: ${notes}`.trim() : currentPayment.notes,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "VERIFY_PAYMENT",
      entityType: "PAYMENT",
      entityId: id,
      beforeData: currentPayment,
      afterData: updated,
    });

    return updated;
  }
}
