import { BillingService } from "./billing.service";

let billingIntervalTimer: NodeJS.Timeout | null = null;

export class BillingScheduler {
  /**
   * Starts periodic recurring billing checks.
   * Default: every 1 hour (configurable in milliseconds).
   */
  static start(intervalMs = 60 * 60 * 1000) {
    if (billingIntervalTimer) {
      return;
    }

    console.log(`⏱️ Recurring Billing Scheduler initialized (interval: ${intervalMs / 1000}s)`);

    billingIntervalTimer = setInterval(async () => {
      try {
        console.log("⏱️ Running scheduled recurring billing sweep...");
        const result = await BillingService.runBillingEngine();
        console.log(
          `⏱️ Scheduled billing completed. Processed: ${result.processedSubscriptionsCount}, Created: ${result.successfulInvoicesCount}, Skipped: ${result.skippedInvoicesCount}, Failed: ${result.failedInvoicesCount}`
        );
      } catch (error) {
        console.error("❌ Scheduled recurring billing sweep error:", error);
      }
    }, intervalMs);
  }

  /**
   * Stops the background billing timer.
   */
  static stop() {
    if (billingIntervalTimer) {
      clearInterval(billingIntervalTimer);
      billingIntervalTimer = null;
      console.log("⏱️ Recurring Billing Scheduler stopped");
    }
  }
}

