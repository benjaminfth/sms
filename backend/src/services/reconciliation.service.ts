import { prisma } from "../database/prisma";
import { PaymentStatus, PaymentMethod } from "@sms/shared";
import { PaginationParams } from "../utils/response";

export class ReconciliationService {
  /**
   * Get reconciliation report for all payments.
   */
  static async getReconciliationReport(pagination: {
    page: number;
    pageSize: number;
    search?: string;
    paymentMethod?: PaymentMethod;
    status?: PaymentStatus;
    onlyUnmatched?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};

    if (pagination.paymentMethod) {
      where.paymentMethod = pagination.paymentMethod;
    }

    if (pagination.status) {
      where.status = pagination.status;
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

    const payments = await prisma.payment.findMany({
      where,
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
    });

    // Calculate allocation metrics
    const records = payments.map((p) => {
      const allocatedSum = p.allocations.reduce(
        (sum, a) => sum + a.allocatedAmountMinor,
        0n
      );
      const unallocated = p.amountMinor > allocatedSum ? p.amountMinor - allocatedSum : 0n;
      const isFullyAllocated = unallocated === 0n && p.amountMinor > 0n;

      return {
        id: p.id,
        paymentReference: p.paymentReference,
        customerId: p.customerId,
        customerName: p.customer.fullName,
        customerCompanyName: p.customer.companyName,
        customerEmail: p.customer.email,
        paymentMethod: p.paymentMethod,
        status: p.status,
        amountMinor: p.amountMinor.toString(),
        allocatedAmountMinor: allocatedSum.toString(),
        unallocatedAmountMinor: unallocated.toString(),
        isFullyAllocated,
        paidAt: p.paidAt.toISOString(),
        allocations: p.allocations.map((a) => ({
          allocationId: a.id,
          invoiceId: a.invoiceId,
          invoiceNumber: a.invoice.invoiceNumber,
          allocatedAmountMinor: a.allocatedAmountMinor.toString(),
        })),
      };
    });

    const filtered = pagination.onlyUnmatched
      ? records.filter((r) => !r.isFullyAllocated && r.status === PaymentStatus.COMPLETED)
      : records;

    const total = filtered.length;
    const paginated = filtered.slice(
      (pagination.page - 1) * pagination.pageSize,
      pagination.page * pagination.pageSize
    );

    const paginationMeta: PaginationParams = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    };

    return { records: paginated, pagination: paginationMeta };
  }

  /**
   * Get list of unmatched or partially allocated completed payments.
   */
  static async getUnmatchedPayments() {
    const report = await this.getReconciliationReport({
      page: 1,
      pageSize: 100,
      onlyUnmatched: true,
      status: PaymentStatus.COMPLETED,
    });

    return report.records;
  }
}
