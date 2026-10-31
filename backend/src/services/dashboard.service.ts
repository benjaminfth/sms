import { prisma } from "../database/prisma";
import {
  SubscriptionStatus,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  DashboardOverviewDTO,
  RevenueAnalyticsDTO,
  SubscriptionAnalyticsDTO,
  InvoiceAnalyticsDTO,
  PaymentMethodAnalyticsDTO,
} from "@sms/shared";

export class DashboardService {
  /**
   * Helper to parse date filter range
   */
  static getDateFilter(period = "30d", customStart?: string, customEnd?: string) {
    const now = new Date();
    let startDate = new Date();

    if (period === "7d") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "30d") {
      startDate.setDate(now.getDate() - 30);
    } else if (period === "90d") {
      startDate.setDate(now.getDate() - 90);
    } else if (period === "1y") {
      startDate.setFullYear(now.getFullYear() - 1);
    } else if (period === "custom" && customStart) {
      startDate = new Date(customStart);
    } else {
      startDate.setDate(now.getDate() - 30);
    }

    const endDate = customEnd ? new Date(customEnd) : now;
    return { startDate, endDate };
  }

  /**
   * Executive Dashboard Overview metrics
   */
  static async getOverview(period = "30d", customStart?: string, customEnd?: string): Promise<DashboardOverviewDTO> {
    const { startDate, endDate } = this.getDateFilter(period, customStart, customEnd);

    const [
      totalCustomers,
      activeSubscriptions,
      newSubscriptionsCount,
      cancelledSubscriptionsCount,
      invoices,
      completedPayments,
    ] = await Promise.all([
      prisma.customer.count({ where: { isActive: true } }),
      prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      prisma.subscription.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.subscription.count({
        where: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.invoice.findMany({
        select: {
          status: true,
          totalAmountMinor: true,
          amountPaidMinor: true,
          balanceDueMinor: true,
          dueDate: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          status: PaymentStatus.COMPLETED,
        },
        select: {
          amountMinor: true,
          paidAt: true,
        },
      }),
    ]);

    let totalInvoicesCount = invoices.length;
    let paidInvoicesCount = 0;
    let outstandingInvoicesCount = 0;
    let overdueInvoicesCount = 0;
    let totalInvoicedMinor = 0n;
    let totalOutstandingMinor = 0n;

    const now = new Date();
    for (const inv of invoices) {
      if (inv.status === InvoiceStatus.VOID || inv.status === InvoiceStatus.CANCELLED) {
        continue;
      }

      totalInvoicedMinor += inv.totalAmountMinor;
      totalOutstandingMinor += inv.balanceDueMinor;

      if (inv.status === InvoiceStatus.PAID) {
        paidInvoicesCount++;
      } else if (inv.status === InvoiceStatus.OVERDUE || (inv.dueDate && inv.dueDate < now && inv.balanceDueMinor > 0n)) {
        overdueInvoicesCount++;
        outstandingInvoicesCount++;
      } else if (inv.balanceDueMinor > 0n) {
        outstandingInvoicesCount++;
      }
    }

    const totalCollectedMinor = completedPayments.reduce(
      (sum, p) => sum + p.amountMinor,
      0n
    );

    return {
      totalCustomers,
      activeSubscriptions,
      newSubscriptionsCount,
      cancelledSubscriptionsCount,
      totalInvoicesCount,
      paidInvoicesCount,
      outstandingInvoicesCount,
      overdueInvoicesCount,
      totalCollectedRevenueMinor: totalCollectedMinor.toString(),
      totalInvoicedRevenueMinor: totalInvoicedMinor.toString(),
      totalOutstandingRevenueMinor: totalOutstandingMinor.toString(),
      currency: "INR",
    };
  }

  /**
   * Revenue trajectory points (invoiced vs collected)
   */
  static async getRevenueAnalytics(
    period = "30d",
    customStart?: string,
    customEnd?: string
  ): Promise<RevenueAnalyticsDTO> {
    const { startDate, endDate } = this.getDateFilter(period, customStart, customEnd);

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { notIn: [InvoiceStatus.VOID, InvoiceStatus.CANCELLED] },
        },
        select: {
          createdAt: true,
          totalAmountMinor: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          paidAt: { gte: startDate, lte: endDate },
          status: PaymentStatus.COMPLETED,
        },
        select: {
          paidAt: true,
          amountMinor: true,
        },
      }),
    ]);

    // Group by Day or Month depending on range length
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const groupByMonth = diffDays > 60;

    const pointsMap = new Map<string, { invoiced: bigint; collected: bigint }>();

    // Pre-populate intervals
    const currentCursor = new Date(startDate);
    while (currentCursor <= endDate) {
      const key = groupByMonth
        ? currentCursor.toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : currentCursor.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      if (!pointsMap.has(key)) {
        pointsMap.set(key, { invoiced: 0n, collected: 0n });
      }

      if (groupByMonth) {
        currentCursor.setMonth(currentCursor.getMonth() + 1);
      } else {
        currentCursor.setDate(currentCursor.getDate() + 1);
      }
    }

    for (const inv of invoices) {
      const key = groupByMonth
        ? inv.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : inv.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const current = pointsMap.get(key);
      if (current) {
        current.invoiced += inv.totalAmountMinor;
      }
    }

    for (const p of payments) {
      const key = groupByMonth
        ? p.paidAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : p.paidAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const current = pointsMap.get(key);
      if (current) {
        current.collected += p.amountMinor;
      }
    }

    let totalInvoiced = 0n;
    let totalCollected = 0n;

    const points = Array.from(pointsMap.entries()).map(([date, data]) => {
      totalInvoiced += data.invoiced;
      totalCollected += data.collected;
      return {
        date,
        invoicedMinor: data.invoiced.toString(),
        collectedMinor: data.collected.toString(),
      };
    });

    return {
      currency: "INR",
      points,
      totalInvoicedMinor: totalInvoiced.toString(),
      totalCollectedMinor: totalCollected.toString(),
    };
  }

  /**
   * Subscription Analytics: Status breakdown & Plan distribution
   */
  static async getSubscriptionAnalytics(): Promise<SubscriptionAnalyticsDTO> {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        plan: {
          select: { id: true, name: true },
        },
      },
    });

    let activeCount = 0;
    let trialingCount = 0;
    let pastDueCount = 0;
    let pausedCount = 0;
    let cancelledCount = 0;
    let expiredCount = 0;

    const planMap = new Map<string, { planId: string; planName: string; count: number }>();

    for (const sub of subscriptions) {
      if (sub.status === SubscriptionStatus.ACTIVE) activeCount++;
      else if (sub.status === SubscriptionStatus.TRIALING) trialingCount++;
      else if (sub.status === SubscriptionStatus.PAST_DUE) pastDueCount++;
      else if (sub.status === SubscriptionStatus.PAUSED) pausedCount++;
      else if (sub.status === SubscriptionStatus.CANCELLED) cancelledCount++;
      else if (sub.status === SubscriptionStatus.EXPIRED) expiredCount++;

      if (sub.plan) {
        const existing = planMap.get(sub.plan.id);
        if (existing) {
          existing.count++;
        } else {
          planMap.set(sub.plan.id, {
            planId: sub.plan.id,
            planName: sub.plan.name,
            count: 1,
          });
        }
      }
    }

    return {
      activeCount,
      trialingCount,
      pastDueCount,
      pausedCount,
      cancelledCount,
      expiredCount,
      byPlan: Array.from(planMap.values()),
    };
  }

  /**
   * Invoice Analytics: Status distribution and monetary volumes
   */
  static async getInvoiceAnalytics(): Promise<InvoiceAnalyticsDTO> {
    const invoices = await prisma.invoice.findMany({
      select: {
        status: true,
        totalAmountMinor: true,
      },
    });

    const statusMap = new Map<InvoiceStatus, { count: number; totalAmountMinor: bigint }>();

    for (const inv of invoices) {
      const statusKey = inv.status as unknown as InvoiceStatus;
      const current = statusMap.get(statusKey);
      if (current) {
        current.count++;
        current.totalAmountMinor += inv.totalAmountMinor;
      } else {
        statusMap.set(statusKey, {
          count: 1,
          totalAmountMinor: inv.totalAmountMinor,
        });
      }
    }

    const statusDistribution = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      totalAmountMinor: data.totalAmountMinor.toString(),
    }));

    return { statusDistribution };
  }

  /**
   * Payment Methods distribution
   */
  static async getPaymentMethodAnalytics(): Promise<PaymentMethodAnalyticsDTO> {
    const payments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED as any,
      },
      select: {
        paymentMethod: true,
        amountMinor: true,
      },
    });

    const methodMap = new Map<PaymentMethod, { count: number; totalAmountMinor: bigint }>();

    for (const p of payments) {
      const methodKey = p.paymentMethod as unknown as PaymentMethod;
      const current = methodMap.get(methodKey);
      if (current) {
        current.count++;
        current.totalAmountMinor += p.amountMinor;
      } else {
        methodMap.set(methodKey, {
          count: 1,
          totalAmountMinor: p.amountMinor,
        });
      }
    }

    const methods = Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      totalAmountMinor: data.totalAmountMinor.toString(),
    }));

    return { methods };
  }
}
