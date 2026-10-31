import { prisma } from "../database/prisma";
import {
  BillingRunStatus,
  BillingAttemptStatus,
  SubscriptionStatus,
  BillingInterval,
} from "@sms/shared";
import { calculateBillingPeriod } from "./billing-period";
import { InvoiceService } from "./invoice.service";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";
import { NotFoundError } from "../utils/errors";

export interface BillingRunResult {
  billingRunId: string;
  targetDate: string;
  processedSubscriptionsCount: number;
  successfulInvoicesCount: number;
  skippedInvoicesCount: number;
  failedInvoicesCount: number;
  status: BillingRunStatus;
  attempts: Array<{
    subscriptionId: string;
    subscriptionNumber: string;
    status: BillingAttemptStatus;
    invoiceId?: string | null;
    invoiceNumber?: string | null;
    errorMessage?: string | null;
  }>;
}

export class BillingService {
  /**
   * Core Recurring Billing Engine.
   * Scans for all active subscriptions due on or before targetDate,
   * generates invoices idempotently, advances billing dates, and logs attempts.
   */
  static async runBillingEngine(
    targetDateInput?: Date | string,
    actorUserId?: string
  ): Promise<BillingRunResult> {
    const targetDate = targetDateInput ? new Date(targetDateInput) : new Date();

    // 1. Initialize BillingRun record
    const billingRun = await prisma.billingRun.create({
      data: {
        runDate: new Date(),
        targetDate,
        status: BillingRunStatus.PROCESSING,
        processedSubscriptionsCount: 0,
        successfulInvoicesCount: 0,
        failedInvoicesCount: 0,
      },
    });

    // 2. Fetch all candidate active subscriptions due for billing
    const candidateSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        nextBillingDate: { lte: targetDate },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
      },
      orderBy: { nextBillingDate: "asc" },
    });

    let successfulCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const attemptResults: BillingRunResult["attempts"] = [];

    // 3. Process each subscription individually in isolated transactions
    for (const sub of candidateSubscriptions) {
      // Respect effective cancellation dates
      if (sub.cancelledAt && sub.cancelledAt <= sub.currentPeriodStart) {
        continue;
      }

      try {
        await prisma.$transaction(async (tx) => {
          // Calculate billing period: start-inclusive, end-exclusive [periodStart, periodEnd)
          const periodStart = sub.currentPeriodEnd;
          const anchorDay = sub.currentPeriodStart.getUTCDate();
          const { periodEnd } = calculateBillingPeriod(
            periodStart,
            sub.billingInterval as unknown as BillingInterval,
            sub.intervalCount,
            anchorDay
          );

          // Payment due date: 15 days from start of period
          const dueDate = new Date(periodStart.getTime() + 15 * 24 * 60 * 60 * 1000);

          // Prepare invoice line items from subscription items
          const lineItems = sub.items.map((item) => ({
            productId: item.productId,
            productVariantId: item.productVariantId,
            description: item.productVariant
              ? `${item.product.name} - ${item.productVariant.name}`
              : item.product.name,
            quantity: item.quantity.toString(),
            unitPriceMinor: item.unitPriceMinor,
          }));

          // Idempotent invoice generation (detects duplicate for same subscription & period)
          const { invoice, isDuplicate } = await InvoiceService.createInvoice(
            {
              customerId: sub.customerId,
              subscriptionId: sub.id,
              billingPeriodStart: periodStart,
              billingPeriodEnd: periodEnd,
              dueDate,
              currency: sub.currency,
              items: lineItems,
            },
            actorUserId,
            tx
          );

          if (isDuplicate) {
            skippedCount++;
            // If invoice existed but nextBillingDate was not advanced yet, advance it
            if (sub.nextBillingDate <= periodStart) {
              await tx.subscription.update({
                where: { id: sub.id },
                data: {
                  currentPeriodStart: periodStart,
                  currentPeriodEnd: periodEnd,
                  nextBillingDate: periodEnd,
                },
              });
            }

            await tx.billingAttempt.create({
              data: {
                billingRunId: billingRun.id,
                subscriptionId: sub.id,
                status: BillingAttemptStatus.SUCCESS,
                invoiceId: invoice.id,
                errorMessage: "Idempotent skip: Invoice already existed for period",
              },
            });

            attemptResults.push({
              subscriptionId: sub.id,
              subscriptionNumber: sub.subscriptionNumber,
              status: BillingAttemptStatus.SUCCESS,
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              errorMessage: "Skipped (Duplicate)",
            });
          } else {
            successfulCount++;

            // Advance subscription's billing dates ONLY after successful invoice creation
            await tx.subscription.update({
              where: { id: sub.id },
              data: {
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                nextBillingDate: periodEnd,
              },
            });

            await tx.billingAttempt.create({
              data: {
                billingRunId: billingRun.id,
                subscriptionId: sub.id,
                status: BillingAttemptStatus.SUCCESS,
                invoiceId: invoice.id,
              },
            });

            attemptResults.push({
              subscriptionId: sub.id,
              subscriptionNumber: sub.subscriptionNumber,
              status: BillingAttemptStatus.SUCCESS,
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
            });
          }
        });
      } catch (err: any) {
        failedCount++;

        // Record failed attempt WITHOUT advancing nextBillingDate
        await prisma.billingAttempt.create({
          data: {
            billingRunId: billingRun.id,
            subscriptionId: sub.id,
            status: BillingAttemptStatus.FAILURE,
            errorMessage: err.message || "Failed to generate recurring invoice",
          },
        });

        attemptResults.push({
          subscriptionId: sub.id,
          subscriptionNumber: sub.subscriptionNumber,
          status: BillingAttemptStatus.FAILURE,
          errorMessage: err.message,
        });
      }
    }

    // 4. Update BillingRun summary
    const finalRun = await prisma.billingRun.update({
      where: { id: billingRun.id },
      data: {
        status: BillingRunStatus.COMPLETED,
        processedSubscriptionsCount: candidateSubscriptions.length,
        successfulInvoicesCount: successfulCount,
        failedInvoicesCount: failedCount,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "EXECUTE_BILLING_RUN",
      entityType: "BILLING_RUN",
      entityId: finalRun.id,
      afterData: {
        targetDate,
        processed: candidateSubscriptions.length,
        successful: successfulCount,
        skipped: skippedCount,
        failed: failedCount,
      },
    });

    return {
      billingRunId: finalRun.id,
      targetDate: targetDate.toISOString(),
      processedSubscriptionsCount: candidateSubscriptions.length,
      successfulInvoicesCount: successfulCount,
      skippedInvoicesCount: skippedCount,
      failedInvoicesCount: failedCount,
      status: finalRun.status as unknown as BillingRunStatus,
      attempts: attemptResults,
    };
  }

  /**
   * List billing runs with pagination.
   */
  static async listBillingRuns(params: { page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [total, runs] = await Promise.all([
      prisma.billingRun.count(),
      prisma.billingRun.findMany({
        skip,
        take: pageSize,
        orderBy: { runDate: "desc" },
        include: {
          _count: {
            select: { attempts: true },
          },
        },
      }),
    ]);

    const pagination: PaginationParams = {
      page,
      pageSize,
      total,
    };

    return { runs, pagination };
  }

  /**
   * Get single billing run with all associated attempts.
   */
  static async getBillingRunById(id: string) {
    const run = await prisma.billingRun.findUnique({
      where: { id },
      include: {
        attempts: {
          include: {
            subscription: {
              select: {
                id: true,
                subscriptionNumber: true,
                customer: {
                  select: { id: true, fullName: true, companyName: true },
                },
              },
            },
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                totalAmountMinor: true,
                status: true,
              },
            },
          },
          orderBy: { attemptedAt: "desc" },
        },
      },
    });

    if (!run) {
      throw new NotFoundError(`Billing run with ID '${id}' not found`);
    }

    return run;
  }

  /**
   * List all billing attempts with filters.
   */
  static async listBillingAttempts(params: {
    page?: number;
    pageSize?: number;
    subscriptionId?: string;
    billingRunId?: string;
  }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.subscriptionId) {
      where.subscriptionId = params.subscriptionId;
    }
    if (params.billingRunId) {
      where.billingRunId = params.billingRunId;
    }

    const [total, attempts] = await Promise.all([
      prisma.billingAttempt.count({ where }),
      prisma.billingAttempt.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { attemptedAt: "desc" },
        include: {
          subscription: true,
          invoice: true,
          billingRun: true,
        },
      }),
    ]);

    const pagination: PaginationParams = {
      page,
      pageSize,
      total,
    };

    return { attempts, pagination };
  }
}
