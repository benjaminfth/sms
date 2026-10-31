import { prisma } from "../database/prisma";
import {
  InvoiceStatus,
  SubscriptionStatus,
  QuotationStatus,
  PaymentStatus,
  PaymentMethod,
} from "@sms/shared";
import {
  NotFoundError,
  ForbiddenError,
  BusinessRuleError,
} from "../utils/errors";
import { InvoiceSettlementService } from "./invoice-settlement.service";
import { demoPaymentProvider } from "./demo-payment-provider.service";
import { createAuditLog } from "./audit.service";
import { parsePaymentNotes } from "./payment.service";

export class PortalService {
  /**
   * Resolve customer record for authenticated user.
   */
  static async getCustomerForUser(userId: string, explicitCustomerId?: string) {
    if (explicitCustomerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: explicitCustomerId },
        include: { user: true },
      });
      if (customer) return customer;
    }

    const customer = await prisma.customer.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!customer) {
      throw new ForbiddenError("No active customer profile is linked to this account");
    }

    return customer;
  }

  /**
   * Customer Portal Overview
   */
  static async getOverview(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundError("Customer profile not found");
    }

    const [activeSubscriptions, recentInvoices, recentPayments] = await Promise.all([
      prisma.subscription.findMany({
        where: {
          customerId,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        },
        include: {
          plan: {
            include: { prices: true },
          },
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.findMany({
        where: {
          customerId,
          status: { notIn: [InvoiceStatus.VOID, InvoiceStatus.CANCELLED] },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          items: true,
        },
      }),
      prisma.payment.findMany({
        where: { customerId },
        orderBy: { paidAt: "desc" },
        take: 5,
        include: {
          allocations: {
            include: {
              invoice: {
                select: { id: true, invoiceNumber: true },
              },
            },
          },
        },
      }),
    ]);

    // Total outstanding balance across all non-void invoices
    const allInvoices = await prisma.invoice.findMany({
      where: {
        customerId,
        status: { notIn: [InvoiceStatus.VOID, InvoiceStatus.CANCELLED, InvoiceStatus.PAID] },
      },
      select: { balanceDueMinor: true },
    });

    const totalOutstandingMinor = allInvoices.reduce(
      (sum, inv) => sum + inv.balanceDueMinor,
      0n
    );

    // Upcoming billing date
    let upcomingBillingDate: string | null = null;
    if (activeSubscriptions.length > 0) {
      const dates = activeSubscriptions
        .map((s) => s.nextBillingDate)
        .filter(Boolean)
        .sort((a, b) => a.getTime() - b.getTime());
      if (dates.length > 0 && dates[0]) {
        upcomingBillingDate = dates[0].toISOString();
      }
    }

    const sanitizedRecentPayments = recentPayments.map((p) => {
      const parsed = parsePaymentNotes(p.notes);
      return {
        ...p,
        notes: parsed.customerNotes || null,
        customerNotes: parsed.customerNotes || null,
      };
    });

    return {
      customer,
      activeSubscriptions,
      upcomingBillingDate,
      recentInvoices,
      totalOutstandingBalanceMinor: totalOutstandingMinor.toString(),
      recentPayments: sanitizedRecentPayments,
    };
  }

  /**
   * My Subscriptions
   */
  static async getSubscriptions(customerId: string) {
    return prisma.subscription.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: {
        plan: {
          include: { prices: true },
        },
        items: {
          include: { product: true, productVariant: true },
        },
        invoices: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  static async getSubscriptionById(customerId: string, subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: {
          include: { prices: true, items: { include: { product: true } } },
        },
        items: {
          include: { product: true, productVariant: true },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!subscription || subscription.customerId !== customerId) {
      throw new NotFoundError("Subscription not found");
    }

    return subscription;
  }

  static async cancelSubscription(
    customerId: string,
    subscriptionId: string,
    reason?: string,
    actorUserId?: string
  ) {
    const subscription = await this.getSubscriptionById(customerId, subscriptionId);

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BusinessRuleError("Subscription is already cancelled");
    }

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason || "Cancelled via Customer Portal",
      },
    });

    await createAuditLog({
      actorUserId,
      action: "CANCEL_SUBSCRIPTION_PORTAL",
      entityType: "SUBSCRIPTION",
      entityId: subscriptionId,
      beforeData: subscription,
      afterData: updated,
    });

    return updated;
  }

  /**
   * My Invoices
   */
  static async getInvoices(customerId: string) {
    return prisma.invoice.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: { product: true },
        },
        paymentAllocations: {
          include: {
            payment: true,
          },
        },
      },
    });
  }

  static async getInvoiceById(customerId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: {
          include: { product: true },
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

    if (!invoice || invoice.customerId !== customerId) {
      throw new NotFoundError("Invoice not found");
    }

    return invoice;
  }

  /**
   * Customer pays an invoice directly through demo payment flow
   */
  static async payInvoice(
    customerId: string,
    invoiceId: string,
    paymentMethod: PaymentMethod = PaymentMethod.CARD,
    actorUserId?: string
  ) {
    const invoice = await this.getInvoiceById(customerId, invoiceId);

    if (invoice.balanceDueMinor <= 0n) {
      throw new BusinessRuleError(`Invoice ${invoice.invoiceNumber} is already fully paid`);
    }

    if (
      invoice.status === InvoiceStatus.VOID ||
      invoice.status === InvoiceStatus.CANCELLED
    ) {
      throw new BusinessRuleError(`Cannot pay an invoice with status ${invoice.status}`);
    }

    const amountMinor = invoice.balanceDueMinor;

    // 1. Process simulated demo payment
    const paymentResult = await demoPaymentProvider.processPayment({
      amountMinor,
      currency: invoice.currency,
      customerId,
      paymentMethod,
      notes: `Portal payment for invoice ${invoice.invoiceNumber}`,
    });

    if (!paymentResult.success) {
      throw new BusinessRuleError(`Payment failed: ${paymentResult.errorMessage}`);
    }

    // 2. Transactionally record payment and allocation
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          paymentReference: paymentResult.transactionReference,
          customerId,
          amountMinor,
          currency: invoice.currency,
          paymentMethod,
          status: PaymentStatus.COMPLETED,
          notes: `Customer Portal payment for invoice ${invoice.invoiceNumber} (DEMO SIMULATION)`,
          paidAt: new Date(),
        },
      });

      const allocation = await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: invoice.id,
          allocatedAmountMinor: amountMinor,
        },
      });

      const updatedInvoice = await InvoiceSettlementService.updateInvoiceSettlement(
        invoice.id,
        tx
      );

      return {
        payment,
        allocation,
        updatedInvoice,
      };
    });

    await createAuditLog({
      actorUserId,
      action: "PORTAL_PAY_INVOICE",
      entityType: "PAYMENT",
      entityId: result.payment.id,
      afterData: result,
    });

    return result;
  }

  /**
   * My Quotations
   */
  static async getQuotations(customerId: string) {
    return prisma.quotation.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: { product: true, productVariant: true },
        },
      },
    });
  }

  static async getQuotationById(customerId: string, quotationId: string) {
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
          include: { product: true, productVariant: true },
        },
        discountApplications: {
          include: { discount: true },
        },
      },
    });

    if (!quotation || quotation.customerId !== customerId) {
      throw new NotFoundError("Quotation not found");
    }

    return quotation;
  }

  static async respondToQuotation(
    customerId: string,
    quotationId: string,
    action: "ACCEPT" | "REJECT",
    actorUserId?: string
  ) {
    const quotation = await this.getQuotationById(customerId, quotationId);

    if (quotation.status !== QuotationStatus.SENT && quotation.status !== QuotationStatus.DRAFT) {
      throw new BusinessRuleError(
        `Quotation ${quotation.quotationNumber} is already ${quotation.status} and cannot be modified`
      );
    }

    const newStatus =
      action === "ACCEPT" ? QuotationStatus.ACCEPTED : QuotationStatus.REJECTED;

    const updated = await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: newStatus },
    });

    await createAuditLog({
      actorUserId,
      action: `${action}_QUOTATION_PORTAL`,
      entityType: "QUOTATION",
      entityId: quotationId,
      beforeData: quotation,
      afterData: updated,
    });

    return updated;
  }

  /**
   * My Payments
   */
  static async getPayments(customerId: string) {
    const payments = await prisma.payment.findMany({
      where: { customerId },
      orderBy: { paidAt: "desc" },
      include: {
        allocations: {
          include: {
            invoice: {
              select: { id: true, invoiceNumber: true, totalAmountMinor: true },
            },
          },
        },
      },
    });

    return payments.map((p) => {
      const parsed = parsePaymentNotes(p.notes);
      return {
        ...p,
        notes: parsed.customerNotes || null,
        customerNotes: parsed.customerNotes || null,
      };
    });
  }

  /**
   * Profile
   */
  static async getProfile(customerId: string) {
    return prisma.customer.findUnique({
      where: { id: customerId },
      include: { user: true },
    });
  }

  static async updateProfile(
    customerId: string,
    data: {
      fullName?: string;
      companyName?: string | null;
      phone?: string | null;
      billingAddressLine1?: string | null;
      billingAddressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      gstOrTaxId?: string | null;
    },
    actorUserId?: string
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data,
    });

    await createAuditLog({
      actorUserId,
      action: "UPDATE_PROFILE_PORTAL",
      entityType: "CUSTOMER",
      entityId: customerId,
      beforeData: customer,
      afterData: updated,
    });

    return updated;
  }
}
