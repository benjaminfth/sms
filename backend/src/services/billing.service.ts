import { prisma } from "../database/prisma";
import {
  SubscriptionStatus,
  BillingRunStatus,
  BillingAttemptStatus,
  InvoiceStatus,
} from "@sms/shared";
import { calculateNextBillingPeriod } from "./billing-period";
import { PricingCalculationService } from "./pricing-calculation.service";
import { SequenceService } from "../utils/sequence.service";
import { createAuditLog } from "./contracts";
import { PaginationParams } from "../utils/response";
import { NotFoundError } from "../utils/errors";

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
   * Executes a billing cycle run for all active subscriptions due on or before targetDate.
   * Concurrency-safe and idempotent against duplicate invoice generation.
   */
  static async executeBillingRun(
    targetDate: Date = new Date(),
    actorUserId?: string | null
  ): Promise<BillingRunResult> {
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

    let processedCount = 0;
    let invoicesGeneratedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const attemptResults: BillingRunResult["attempts"] = [];

    try {
      // 2. Fetch all ACTIVE subscriptions due for billing on or before targetDate
      // Paused, Cancelled, and Expired subscriptions are strictly excluded
      const dueSubscriptions = await prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          nextBillingDate: {
            lte: targetDate,
          },
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
        orderBy: {
          nextBillingDate: "asc",
        },
      });

      // 3. Process each due subscription independently with transactional isolation
      for (const sub of dueSubscriptions) {
        processedCount++;

        try {
          const outcome = await prisma.$transaction(async (tx) => {
            // A. Idempotency Check: verify if an invoice already exists for this exact period
            const existingInvoice = await tx.invoice.findFirst({
              where: {
                subscriptionId: sub.id,
                billingPeriodStart: sub.currentPeriodStart,
                billingPeriodEnd: sub.currentPeriodEnd,
              },
            });

            if (existingInvoice) {
              // Period has already been invoiced. Advance subscription if needed and record attempt.
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
              items: sub.items.map((it) => {
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

            // C. Generate sequential invoice number
            const invoiceNumber = await SequenceService.getNextNumber("INV");

            // Due date: 15 days from period start or current date
            const dueDate = new Date(sub.currentPeriodStart);
            dueDate.setUTCDate(dueDate.getUTCDate() + 15);

            // D. Create Invoice & frozen InvoiceItems snapshot
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
                issuedAt: new Date(),
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

            // E. Advance Subscription Billing Dates ONLY after successful invoice generation
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

            // F. Record Billing Attempt
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
          failedCount++;
          const errorMessage = subErr?.message || "Unknown error during billing generation";

          // Log failed attempt without advancing subscription billing date
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

      // 4. Update BillingRun summary
      await prisma.billingRun.update({
        where: { id: billingRun.id },
        data: {
          status: BillingRunStatus.COMPLETED,
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
        },
      });

      return {
        runId: billingRun.id,
        targetDate: targetDate.toISOString(),
        processedCount,
        invoicesGeneratedCount,
        failedCount,
        skippedCount,
        status: BillingRunStatus.COMPLETED,
        attempts: attemptResults,
      };
    } catch (runErr: any) {
      await prisma.billingRun.update({
        where: { id: billingRun.id },
        data: {
          status: BillingRunStatus.FAILED,
          errorDetails: runErr?.message || "Billing run encountered a critical error",
        },
      });
      throw runErr;
    }
  }

  /**
   * Retrieves paginated billing runs.
   */
  static async getBillingRuns(query: {
    page?: number;
    pageSize?: number;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const [runs, total] = await Promise.all([
      prisma.billingRun.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          attempts: {
            take: 5,
            include: {
              subscription: true,
              invoice: true,
            },
          },
        },
      }),
      prisma.billingRun.count(),
    ]);

    const pagination: PaginationParams = { page, pageSize, total };
    return { runs, pagination };
  }

  /**
   * Retrieves single billing run details with all attempts.
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
   * Retrieves billing attempts.
   */
  static async getBillingAttempts(query: {
    page?: number;
    pageSize?: number;
    subscriptionId?: string;
    billingRunId?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.subscriptionId) where.subscriptionId = query.subscriptionId;
    if (query.billingRunId) where.billingRunId = query.billingRunId;

    const [attempts, total] = await Promise.all([
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
      prisma.billingAttempt.count({ where }),
    ]);

    const pagination: PaginationParams = { page, pageSize, total };
    return { attempts, pagination };
  }
}
