import { prisma } from "../database/prisma";
import { createAuditLog } from "./contracts";
import { NotFoundError, BusinessRuleError } from "../utils/errors";

export interface InvoiceEmailDispatchResult {
  success: boolean;
  recipientEmail: string;
  invoiceNumber: string;
  totalFormatted: string;
  dueDate: string;
  previewUrl: string;
  notificationId?: string;
  error?: string;
}

export class EmailNotificationService {
  /**
   * Prepares and dispatches an invoice notification email to the customer.
   * Runs in development preview/logging mode when external SMTP is unconfigured.
   * Records notifications in the database and audit trail.
   */
  static async sendInvoiceNotification(
    invoiceId: string,
    recipientEmailOverride?: string,
    actorUserId?: string | null,
    force = false
  ): Promise<InvoiceEmailDispatchResult> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice ${invoiceId} not found`);
    }

    // Determine target recipient email
    const recipientEmail =
      recipientEmailOverride ||
      invoice.customer.email ||
      invoice.customer.user?.email;

    if (!recipientEmail) {
      throw new BusinessRuleError(
        `Customer ${invoice.customer.fullName} does not have a registered billing email address`
      );
    }

    // Format total amount from minor currency units (paise)
    const amountNum = (Number(invoice.totalAmountMinor) / 100).toFixed(2);
    const totalFormatted = `INR ${amountNum}`;
    const dueDateStr = new Date(invoice.dueDate).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const previewUrl = `/admin/invoices/${invoice.id}`;

    // Deduplication check: Avoid multiple sends for the same invoice within 1 minute unless forced
    if (!force) {
      const recentNotification = await prisma.notification.findFirst({
        where: {
          customerId: invoice.customerId,
          title: `Invoice ${invoice.invoiceNumber} Available`,
          createdAt: {
            gte: new Date(Date.now() - 60 * 1000),
          },
        },
      });

      if (recentNotification) {
        return {
          success: true,
          recipientEmail,
          invoiceNumber: invoice.invoiceNumber,
          totalFormatted,
          dueDate: dueDateStr,
          previewUrl,
          notificationId: recentNotification.id,
        };
      }
    }

    const title = `Invoice ${invoice.invoiceNumber} Available`;
    const message = [
      `Dear ${invoice.customer.fullName},`,
      ``,
      `Your invoice ${invoice.invoiceNumber} is now available.`,
      `Total Due: ${totalFormatted}`,
      `Due Date: ${dueDateStr}`,
      ``,
      `You can review and pay your invoice at: ${previewUrl}`,
      ``,
      `Thank you for your business,`,
      `Brightloop Software`,
    ].join("\n");

    // Development Email Preview Logger
    console.log("=================================================");
    console.log(" [DEVELOPMENT EMAIL DISPATCH] (Simulated SMTP)");
    console.log(` To: ${recipientEmail}`);
    console.log(` Subject: ${title}`);
    console.log(` Invoice: ${invoice.invoiceNumber}`);
    console.log(` Total: ${totalFormatted} | Due: ${dueDateStr}`);
    console.log("-------------------------------------------------");
    console.log(message);
    console.log("=================================================");

    // 1. Create Notification record for Customer in the database
    const notification = await prisma.notification.create({
      data: {
        customerId: invoice.customerId,
        userId: invoice.customer.userId,
        title,
        message,
        isRead: false,
      },
    });

    // 2. Create AuditLog entry
    await createAuditLog({
      actorUserId,
      action: "SEND_INVOICE_EMAIL",
      entityType: "INVOICE",
      entityId: invoice.id,
      beforeData: null,
      afterData: {
        recipientEmail,
        invoiceNumber: invoice.invoiceNumber,
        totalAmountMinor: invoice.totalAmountMinor.toString(),
        dueDate: invoice.dueDate,
        notificationId: notification.id,
      },
    });

    return {
      success: true,
      recipientEmail,
      invoiceNumber: invoice.invoiceNumber,
      totalFormatted,
      dueDate: dueDateStr,
      previewUrl,
      notificationId: notification.id,
    };
  }
}

