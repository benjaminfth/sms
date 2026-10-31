import { prisma as defaultPrisma } from "../database/prisma";
import { InvoiceStatus, PaymentStatus } from "@sms/shared";
import { NotFoundError } from "../utils/errors";

export class InvoiceSettlementService {
  /**
   * Recalculates amount paid, balance due, and payment status for an invoice.
   * Can be executed within an existing Prisma transaction client or standalone.
   */
  static async updateInvoiceSettlement(invoiceId: string, tx?: any) {
    const db = tx || defaultPrisma;

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice with ID ${invoiceId} not found`);
    }

    // Do not alter void or cancelled invoices
    if (
      invoice.status === InvoiceStatus.VOID ||
      invoice.status === InvoiceStatus.CANCELLED
    ) {
      return invoice;
    }

    // Aggregate all successful allocations for this invoice
    const allocations = await db.paymentAllocation.findMany({
      where: {
        invoiceId,
        payment: {
          status: PaymentStatus.COMPLETED,
        },
      },
    });

    const totalPaid = allocations.reduce(
      (sum: bigint, alloc: any) => sum + alloc.allocatedAmountMinor,
      0n
    );

    const balanceDue =
      invoice.totalAmountMinor > totalPaid ? invoice.totalAmountMinor - totalPaid : 0n;

    let newStatus = invoice.status;
    let paidAt = invoice.paidAt;

    if (balanceDue === 0n && invoice.totalAmountMinor > 0n) {
      newStatus = InvoiceStatus.PAID;
      if (!paidAt) {
        paidAt = new Date();
      }
    } else if (totalPaid > 0n && balanceDue > 0n) {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
      paidAt = null;
    } else if (totalPaid === 0n) {
      const isPastDue = invoice.dueDate && new Date() > invoice.dueDate;
      newStatus = isPastDue ? InvoiceStatus.OVERDUE : InvoiceStatus.ISSUED;
      paidAt = null;
    }

    const updatedInvoice = await db.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaidMinor: totalPaid,
        balanceDueMinor: balanceDue,
        status: newStatus,
        paidAt,
      },
    });

    return updatedInvoice;
  }
}
