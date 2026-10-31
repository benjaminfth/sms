import { BillingInterval } from "@sms/shared";

export interface BillingPeriodResult {
  periodStart: Date;
  periodEnd: Date;
  nextBillingDate: Date;
}

/**
 * Returns the number of days in the specified month (0-indexed month) and year in UTC.
 */
export function getDaysInMonthUTC(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Determines whether a year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Centralized, deterministic calculation of billing periods.
 * Uses start-inclusive, end-exclusive convention: [periodStart, periodEnd).
 * Preserves anchor day for monthly and yearly subscriptions.
 */
export function calculateNextBillingPeriod(
  periodStart: Date,
  interval: BillingInterval | string,
  intervalCount = 1,
  anchorDay?: number
): BillingPeriodResult {
  const start = new Date(periodStart);
  const anchor = anchorDay ?? start.getUTCDate();
  let end: Date;

  switch (interval) {
    case BillingInterval.DAILY:
    case "DAILY": {
      end = new Date(start.getTime());
      end.setUTCDate(end.getUTCDate() + intervalCount);
      break;
    }

    case BillingInterval.WEEKLY:
    case "WEEKLY": {
      end = new Date(start.getTime());
      end.setUTCDate(end.getUTCDate() + 7 * intervalCount);
      break;
    }

    case BillingInterval.MONTHLY:
    case "MONTHLY": {
      const startYear = start.getUTCFullYear();
      const startMonth = start.getUTCMonth();
      const startHours = start.getUTCHours();
      const startMinutes = start.getUTCMinutes();
      const startSeconds = start.getUTCSeconds();
      const startMillis = start.getUTCMilliseconds();

      const totalMonths = startMonth + intervalCount;
      const targetYear = startYear + Math.floor(totalMonths / 12);
      const targetMonth = ((totalMonths % 12) + 12) % 12;

      const maxDaysInTargetMonth = getDaysInMonthUTC(targetYear, targetMonth);
      const targetDay = Math.min(anchor, maxDaysInTargetMonth);

      end = new Date(
        Date.UTC(
          targetYear,
          targetMonth,
          targetDay,
          startHours,
          startMinutes,
          startSeconds,
          startMillis
        )
      );
      break;
    }

    case BillingInterval.YEARLY:
    case "YEARLY": {
      const startYear = start.getUTCFullYear();
      const startMonth = start.getUTCMonth();
      const startHours = start.getUTCHours();
      const startMinutes = start.getUTCMinutes();
      const startSeconds = start.getUTCSeconds();
      const startMillis = start.getUTCMilliseconds();

      const targetYear = startYear + intervalCount;
      const maxDays = getDaysInMonthUTC(targetYear, startMonth);
      const targetDay = Math.min(anchor, maxDays);

      end = new Date(
        Date.UTC(
          targetYear,
          startMonth,
          targetDay,
          startHours,
          startMinutes,
          startSeconds,
          startMillis
        )
      );
      break;
    }

    default:
      throw new Error(`Unsupported billing interval: ${interval}`);
  }

  return {
    periodStart: start,
    periodEnd: end,
    nextBillingDate: end,
  };
}

/**
 * Checks if a subscription is due for billing on or before the target date.
 */
export function isSubscriptionDueForBilling(
  nextBillingDate: Date,
  targetDate: Date = new Date()
): boolean {
  return nextBillingDate.getTime() <= targetDate.getTime();
}
