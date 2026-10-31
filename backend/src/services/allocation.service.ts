import { prisma } from "../database/prisma";
import { PaymentStatus, InvoiceStatus } from "@sms/shared";
import {
  NotFoundError,
  BusinessRuleError,
} from "../utils/errors";
import { InvoiceSettlementService } from "./invoice-settlement.service";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";

export interface InvoiceAllocationItem {
  invoiceId: string;
  allocatedAmountMinor: string | bigint;
}

export class AllocationService {
  /**
   * Allocate an eligible COMPLETED payment across one or more invoices transactionally.
   */
  static async allocatePayment(
    paymentId: string,
    allocations: InvoiceAllocationItem[],
    actorUserId?: string
  ) {
    if (!allocations || allocations.length === 0) {
      throw new BusinessRuleError("At least one allocation item is required");
    }

    return prisma.$transaction(async (tx) => {
      // 1. Fetch payment with existing allocations
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          allocations: true,
          customer: true,
        },
      });

      if (!payment) {
        throw new NotFoundError(`Payment with ID ${paymentId} not found`);
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new BusinessRuleError(
          `Only COMPLETED payments can be allocated to invoices. Current payment status is ${payment.status}`
        );
      }

      // Calculate existing allocated total
      const currentAllocatedTotal = payment.allocations.reduce(
        (sum, a) => sum + a.allocatedAmountMinor,
        0n
      );

      const requestedTotal = allocations.reduce(
        (sum, a) => sum + BigInt(a.allocatedAmountMinor),
        0n
      );

      const availableToAllocate = payment.amountMinor - currentAllocatedTotal;

      if (requestedTotal > availableToAllocate) {
        throw new BusinessRuleError(
          `Cannot allocate ${requestedTotal} paise. Available unallocated amount on payment is ${availableToAllocate} paise.`
        );
      }

      const createdAllocations = [];
      const updatedInvoices = [];

      // 2. Validate and apply each allocation
      for (const item of allocations) {
        const itemAmount = BigInt(item.allocatedAmountMinor);
        if (itemAmount <= 0n) {
          throw new BusinessRuleError("Allocated amount must be greater than zero");
        }

        const invoice = await tx.invoice.findUnique({
          where: { id: item.invoiceId },
        });

        if (!invoice) {
          throw new NotFoundError(`Invoice ${item.invoiceId} not found`);
        }

        if (invoice.customerId !== payment.customerId) {
          throw new BusinessRuleError(
            `Invoice ${invoice.invoiceNumber} belongs to customer ${invoice.customerId}, but payment belongs to customer ${payment.customerId}`
          );
        }

        if (
          invoice.status === InvoiceStatus.VOID ||
          invoice.status === InvoiceStatus.CANCELLED
        ) {
          throw new BusinessRuleError(
            `Cannot allocate payment to an invoice with status ${invoice.status}`
          );
        }

        if (invoice.balanceDueMinor < itemAmount) {
          throw new BusinessRuleError(
            `Allocated amount (${itemAmount} paise) exceeds outstanding balance (${invoice.balanceDueMinor} paise) of invoice ${invoice.invoiceNumber}`
          );
        }

        // Create allocation record
        const allocation = await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: invoice.id,
            allocatedAmountMinor: itemAmount,
          },
        });

        createdAllocations.push(allocation);

        // Update invoice balance and status transactionally
        const updatedInvoice = await InvoiceSettlementService.updateInvoiceSettlement(
          invoice.id,
          tx
        );
        updatedInvoices.push(updatedInvoice);
      }

      await createAuditLog({
        actorUserId,
        action: "ALLOCATE_PAYMENT",
        entityType: "PAYMENT",
        entityId: payment.id,
        afterData: {
          paymentId: payment.id,
          allocations: createdAllocations,
        },
      });

      return {
        paymentId: payment.id,
        allocations: createdAllocations,
        updatedInvoices,
      };
    });
  }

  /**
   * List all payment allocations with pagination.
   */
  static async getAllocations(pagination: {
    page: number;
    pageSize: number;
    paymentId?: string;
    invoiceId?: string;
  }) {
    const where: any = {};
    if (pagination.paymentId) where.paymentId = pagination.paymentId;
    if (pagination.invoiceId) where.invoiceId = pagination.invoiceId;

    const [total, allocations] = await Promise.all([
      prisma.paymentAllocation.count({ where }),
      prisma.paymentAllocation.findMany({
        where,
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          payment: {
            select: {
              id: true,
              paymentReference: true,
              paymentMethod: true,
              status: true,
              customerId: true,
              customer: { select: { fullName: true, companyName: true, email: true } },
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              totalAmountMinor: true,
              balanceDueMinor: true,
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

    return { allocations, pagination: paginationMeta };
  }
}
