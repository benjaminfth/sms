import { prisma } from "../database/prisma";
import {
  SubscriptionStatus,
  BillingRunStatus,
  BillingAttemptStatus,
  InvoiceStatus,
} from "@sms/shared";
import { calculateNextBillingPeriod } from "./billing-period";
import { PricingCalculationService } from "./pricing-calculation.service";
import { EmailNotificationService } from "./email-notification.service";
import { calculateDueDateFromPaymentTerms } from "../utils/payment-terms";
import { PlanPolicyHelper } from "../utils/plan-policy";
import { SequenceService } from "../utils/sequence.service";
import { SubscriptionService } from "./subscription.service";
import { createAuditLog } from "./contracts";
import { PaginationParams } from "../utils/response";
import { NotFoundError } from "../utils/errors";

export interface BillingRunOptions {
  targetDate?: Date;
  batchSize?: number;
  retryFailedOnly?: boolean;
  maxRetries?: number;
  autoCloseExpired?: boolean;
}

export interface BillingRunResult {
  runId: string;
  targetDate: string;
  processedCount: number;
  invoicesGeneratedCount: number;
  failedCount: number;
  skippedCount: number;
  status: BillingRunStatus;
  attempts: Array<{
    subscriptionId: string;
    subscriptionNumber: string;
    status: BillingAttemptStatus;
    invoiceId?: string | null;
    invoiceNumber?: string | null;
    error?: string | null;
  }>;
}

export class BillingService {
  /**
   * Executes a billing cycle run for subscriptions due on or before targetDate.
   * Concurrency-safe, idempotent, with sequential missed period catch-up,
   * bounded batch processing, and failure isolation.
   */
  static async executeBillingRun(
    options: BillingRunOptions = {},
    actorUserId?: string | null
  ): Promise<BillingRunResult> {
    const targetDate = options.targetDate || new Date();
    const batchSize = Math.max(1, Math.min(options.batchSize || 50, 500));
    const maxRetries = options.maxRetries || 3;
    const retryFailedOnly = !!options.retryFailedOnly;
    const autoCloseExpired = options.autoCloseExpired !== false;

    // 1. Auto-close expired subscriptions before generating new invoices
    if (autoCloseExpired) {
      try {
        await SubscriptionService.autoCloseExpiredSubscriptions(targetDate);
      } catch (err) {
        console.warn("[BillingService] Auto-close expired subscriptions warning:", err);
      }
    }

    // 2. Initialize BillingRun record
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

    let processedCount = 0;
    let invoicesGeneratedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const attemptResults: BillingRunResult["attempts"] = [];

    try {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        // Query bounded batch
        let dueSubscriptions: any[] = [];

        if (retryFailedOnly) {
          // Identify subscriptions that failed in recent runs and have failure count < maxRetries
          const failedAttempts = await prisma.billingAttempt.findMany({
            where: {
              status: BillingAttemptStatus.FAILURE,
            },
            distinct: ["subscriptionId"],
            select: { subscriptionId: true },
            take: batchSize,
            skip: offset,
          });

          const subIds = failedAttempts.map((a) => a.subscriptionId);
          if (subIds.length === 0) {
            hasMore = false;
            break;
          }

          dueSubscriptions = await prisma.subscription.findMany({
            where: {
              id: { in: subIds },
              status: SubscriptionStatus.ACTIVE,
            },
            include: {
              customer: true,
              plan: true,
              items: {
                include: {
                  product: true,
                  productVariant: true,
                },
              },
            },
          });
        } else {
          // Standard due subscription query
          dueSubscriptions = await prisma.subscription.findMany({
            where: {
              status: SubscriptionStatus.ACTIVE,
              nextBillingDate: {
                lte: targetDate,
              },
            },
            include: {
              customer: true,
              plan: true,
              items: {
                include: {
                  product: true,
                  productVariant: true,
                },
              },
            },
            orderBy: {
              nextBillingDate: "asc",
            },
            take: batchSize,
            skip: offset,
          });
        }

        if (dueSubscriptions.length === 0) {
          hasMore = false;
          break;
        }

        // Process batch
        for (const sub of dueSubscriptions) {
          processedCount++;

          // Check if subscription has exceeded max failure threshold
          const recentFailures = await prisma.billingAttempt.count({
            where: {
              subscriptionId: sub.id,
              status: BillingAttemptStatus.FAILURE,
            },
          });

          if (recentFailures >= maxRetries && !retryFailedOnly) {
            skippedCount++;
            attemptResults.push({
              subscriptionId: sub.id,
              subscriptionNumber: sub.subscriptionNumber,
              status: BillingAttemptStatus.FAILURE,
              error: `Permanently failing: exceeded maximum retry limit (${maxRetries}). Requires staff review.`,
            });
            continue;
          }

          let subFailed = false;

          // Sequential catch-up loop for missed periods:
          // In case the billing engine was offline, bill every missed period in chronological order
          while (
            sub.nextBillingDate <= targetDate &&
            sub.status === SubscriptionStatus.ACTIVE &&
            !subFailed
          ) {
            try {
              const outcome = await prisma.$transaction(async (tx) => {
                // A. Idempotency Check: check if invoice already exists for this exact period
                const existingInvoice = await tx.invoice.findFirst({
                  where: {
                    subscriptionId: sub.id,
                    billingPeriodStart: sub.currentPeriodStart,
                    billingPeriodEnd: sub.currentPeriodEnd,
                  },
                });

                if (existingInvoice) {
                  // Period already invoiced: advance subscription and record attempt
                  const anchorDay = sub.currentPeriodStart.getUTCDate();
                  const nextPeriod = calculateNextBillingPeriod(
                    sub.currentPeriodEnd,
                    sub.billingInterval,
                    sub.intervalCount,
                    anchorDay
                  );

                  await tx.subscription.update({
                    where: { id: sub.id },
                    data: {
                      currentPeriodStart: sub.currentPeriodEnd,
                      currentPeriodEnd: nextPeriod.periodEnd,
                      nextBillingDate: nextPeriod.nextBillingDate,
                    },
                  });

                  sub.currentPeriodStart = sub.currentPeriodEnd;
                  sub.currentPeriodEnd = nextPeriod.periodEnd;
                  sub.nextBillingDate = nextPeriod.nextBillingDate;

                  await tx.billingAttempt.create({
                    data: {
                      billingRunId: billingRun.id,
                      subscriptionId: sub.id,
                      status: BillingAttemptStatus.SUCCESS,
                      invoiceId: existingInvoice.id,
                    },
                  });

                  return {
                    type: "SKIPPED_EXISTING",
                    invoice: existingInvoice,
                  };
                }

                // B. Calculate line items and totals
                const calculation = await PricingCalculationService.calculateTotals({
                  customerId: sub.customerId,
                  currency: sub.currency,
                  items: sub.items.map((it: any) => {
                    const desc =
                      it.productVariant
                        ? `${it.product.name} - ${it.productVariant.name}`
                        : it.product.name;
                    return {
                      productId: it.productId,
                      productVariantId: it.productVariantId,
                      description: desc,
                      quantity: it.quantity ? String(it.quantity) : "1.000",
                      unitPriceMinor: it.unitPriceMinor,
                    };
                  }),
                  billingPeriodStart: sub.currentPeriodStart,
                  billingPeriodEnd: sub.currentPeriodEnd,
                });

                // C. Concurrency-safe invoice number
                const invoiceNumber = await SequenceService.getNextNumber("INV");

                // D. Determine payment terms and due date
                const paymentTerms = PlanPolicyHelper.getDefaultPaymentTerms(sub.plan);
                const issuedAt = new Date();
                const dueDate = calculateDueDateFromPaymentTerms(issuedAt, paymentTerms);

                // E. Create Invoice & frozen snapshots
                const invoice = await tx.invoice.create({
                  data: {
                    invoiceNumber,
                    customerId: sub.customerId,
                    subscriptionId: sub.id,
                    status: InvoiceStatus.ISSUED,
                    currency: sub.currency,
                    subtotalMinor: calculation.subtotalMinor,
                    taxAmountMinor: calculation.taxAmountMinor,
                    discountAmountMinor: calculation.discountAmountMinor,
                    totalAmountMinor: calculation.totalAmountMinor,
                    amountPaidMinor: 0n,
                    balanceDueMinor: calculation.totalAmountMinor,
                    dueDate,
                    billingPeriodStart: sub.currentPeriodStart,
                    billingPeriodEnd: sub.currentPeriodEnd,
                    issuedAt,
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
                });

                // F. Advance Subscription Dates ONLY on success
                const anchorDay = sub.currentPeriodStart.getUTCDate();
                const nextPeriod = calculateNextBillingPeriod(
                  sub.currentPeriodEnd,
                  sub.billingInterval,
                  sub.intervalCount,
                  anchorDay
                );

                await tx.subscription.update({
                  where: { id: sub.id },
                  data: {
                    currentPeriodStart: sub.currentPeriodEnd,
                    currentPeriodEnd: nextPeriod.periodEnd,
                    nextBillingDate: nextPeriod.nextBillingDate,
                  },
                });

                // Update in-memory dates for catch-up loop
                sub.currentPeriodStart = sub.currentPeriodEnd;
                sub.currentPeriodEnd = nextPeriod.periodEnd;
                sub.nextBillingDate = nextPeriod.nextBillingDate;

                // G. Record Billing Attempt
                await tx.billingAttempt.create({
                  data: {
                    billingRunId: billingRun.id,
                    subscriptionId: sub.id,
                    status: BillingAttemptStatus.SUCCESS,
                    invoiceId: invoice.id,
                  },
                });

                return {
                  type: "CREATED",
                  invoice,
                };
              });

              if (outcome.type === "CREATED") {
                invoicesGeneratedCount++;
                attemptResults.push({
                  subscriptionId: sub.id,
                  subscriptionNumber: sub.subscriptionNumber,
                  status: BillingAttemptStatus.SUCCESS,
                  invoiceId: outcome.invoice.id,
                  invoiceNumber: outcome.invoice.invoiceNumber,
                });

                // Asynchronously dispatch notification
                EmailNotificationService.sendInvoiceNotification(outcome.invoice.id).catch(
                  (err) => console.warn(`[BillingService] Notification error:`, err)
                );
              } else {
                skippedCount++;
                attemptResults.push({
                  subscriptionId: sub.id,
                  subscriptionNumber: sub.subscriptionNumber,
                  status: BillingAttemptStatus.SUCCESS,
                  invoiceId: outcome.invoice.id,
                  invoiceNumber: outcome.invoice.invoiceNumber,
                  error: "Invoice already existed for period; skipped duplicate creation",
                });
              }
            } catch (subErr: any) {
              subFailed = true;
              failedCount++;
              const errorMessage = subErr?.message || "Unknown error during billing generation";

              // Log failed attempt without advancing subscription dates
              await prisma.billingAttempt.create({
                data: {
                  billingRunId: billingRun.id,
                  subscriptionId: sub.id,
                  status: BillingAttemptStatus.FAILURE,
                  errorMessage,
                },
              });

              attemptResults.push({
                subscriptionId: sub.id,
                subscriptionNumber: sub.subscriptionNumber,
                status: BillingAttemptStatus.FAILURE,
                error: errorMessage,
              });
            }
          }
        }

        // Advance batch offset
        offset += dueSubscriptions.length;
        if (dueSubscriptions.length < batchSize) {
          hasMore = false;
        }
      }

      // 4. Update BillingRun summary
      const finalStatus =
        failedCount > 0 && invoicesGeneratedCount === 0
          ? BillingRunStatus.FAILED
          : BillingRunStatus.COMPLETED;

      await prisma.billingRun.update({
        where: { id: billingRun.id },
        data: {
          status: finalStatus,
          processedSubscriptionsCount: processedCount,
          successfulInvoicesCount: invoicesGeneratedCount,
          failedInvoicesCount: failedCount,
        },
      });

      await createAuditLog({
        actorUserId,
        action: "EXECUTE_BILLING_RUN",
        entityType: "BILLING_RUN",
        entityId: billingRun.id,
        afterData: {
          targetDate,
          processedCount,
          invoicesGeneratedCount,
          failedCount,
          skippedCount,
          status: finalStatus,
        },
      });

      return {
        runId: billingRun.id,
        targetDate: targetDate.toISOString(),
        processedCount,
        invoicesGeneratedCount,
        failedCount,
        skippedCount,
        status: finalStatus,
        attempts: attemptResults,
      };
    } catch (runErr: any) {
      await prisma.billingRun.update({
        where: { id: billingRun.id },
        data: {
          status: BillingRunStatus.FAILED,
          errorDetails: runErr?.message || "Fatal error during billing engine execution",
        },
      });

      throw runErr;
    }
  }

  /**
   * Retrieves paginated billing runs.
   */
  static async getBillingRuns(query: { page?: number; pageSize?: number }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const [runs, total] = await Promise.all([
      prisma.billingRun.findMany({
        skip,
        take: pageSize,
        orderBy: { runDate: "desc" },
      }),
      prisma.billingRun.count(),
    ]);

    const pagination: PaginationParams = { page, pageSize, total };
    return { runs, pagination };
  }

  /**
   * Retrieves single billing run details with all attempt outcomes.
   */
  static async getBillingRunById(id: string) {
    const run = await prisma.billingRun.findUnique({
      where: { id },
      include: {
        attempts: {
          include: {
            subscription: {
              include: {
                customer: true,
              },
            },
            invoice: true,
          },
          orderBy: { attemptedAt: "desc" },
        },
      },
    });

    if (!run) {
      throw new NotFoundError("Billing run not found");
    }

    return run;
  }

  /**
   * Retrieves paginated individual billing attempts.
   */
  static async getBillingAttempts(query: {
    page?: number;
    pageSize?: number;
    subscriptionId?: string;
    status?: BillingAttemptStatus;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.subscriptionId) where.subscriptionId = query.subscriptionId;
    if (query.status) where.status = query.status;

    const [attempts, total] = await Promise.all([
      prisma.billingAttempt.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { attemptedAt: "desc" },
        include: {
          subscription: {
            include: {
              customer: true,
            },
          },
          invoice: true,
          billingRun: true,
        },
      }),
      prisma.billingAttempt.count({ where }),
    ]);

    const pagination: PaginationParams = { page, pageSize, total };
    return { attempts, pagination };
  }
}
