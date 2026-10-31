import { BillingInterval } from "@sms/shared";

export interface BillingPeriodResult {
  periodStart: Date;
  periodEnd: Date;
  anchorDay: number;
}

/**
 * Returns the number of days in a given UTC month of a given UTC year.
 */
export function getDaysInUTCMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Check if a UTC year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Calculate the next billing period in a start-inclusive, end-exclusive convention: [periodStart, periodEnd).
 * Preserves the original monthly billing anchor day across varying month lengths and leap years.
 *
 * @param periodStart The start date of the billing period
 * @param interval The billing interval (DAILY, WEEKLY, MONTHLY, YEARLY)
 * @param intervalCount The multiplier (e.g. 1 for monthly, 3 for quarterly)
 * @param preservedAnchorDay The original billing day (1-31) to anchor monthly/yearly cycles
 */
export function calculateBillingPeriod(
  periodStartInput: Date | string,
  interval: BillingInterval,
  intervalCount = 1,
  preservedAnchorDay?: number
): BillingPeriodResult {
  const periodStart = new Date(periodStartInput);
  if (isNaN(periodStart.getTime())) {
    throw new Error("Invalid period start date");
  }

  if (intervalCount < 1) {
    throw new Error("Interval count must be at least 1");
  }

  const startYear = periodStart.getUTCFullYear();
  const startMonth = periodStart.getUTCMonth();
  const startDay = periodStart.getUTCDate();
  const startHour = periodStart.getUTCHours();
  const startMinute = periodStart.getUTCMinutes();
  const startSecond = periodStart.getUTCSeconds();
  const startMs = periodStart.getUTCMilliseconds();

  const anchorDay = preservedAnchorDay ?? startDay;

  let periodEnd: Date;

  switch (interval) {
    case BillingInterval.DAILY: {
      periodEnd = new Date(
        Date.UTC(
          startYear,
          startMonth,
          startDay + intervalCount,
          startHour,
          startMinute,
          startSecond,
          startMs
        )
      );
      break;
    }

    case BillingInterval.WEEKLY: {
      periodEnd = new Date(
        Date.UTC(
          startYear,
          startMonth,
          startDay + 7 * intervalCount,
          startHour,
          startMinute,
          startSecond,
          startMs
        )
      );
      break;
    }

    case BillingInterval.MONTHLY: {
      const totalMonths = startMonth + intervalCount;
      const targetYear = startYear + Math.floor(totalMonths / 12);
      const targetMonth = ((totalMonths % 12) + 12) % 12;

      const maxDaysInTargetMonth = getDaysInUTCMonth(targetYear, targetMonth);
      const targetDay = Math.min(anchorDay, maxDaysInTargetMonth);

      periodEnd = new Date(
        Date.UTC(
          targetYear,
          targetMonth,
          targetDay,
          startHour,
          startMinute,
          startSecond,
          startMs
        )
      );
      break;
    }

    case BillingInterval.YEARLY: {
      const targetYear = startYear + intervalCount;
      let targetDay = anchorDay;

      // Handle leap day anchor (Feb 29) when advancing to a non-leap year
      if (startMonth === 1 && anchorDay === 29) {
        if (!isLeapYear(targetYear)) {
          targetDay = 28;
        }
      } else {
        const maxDaysInTargetMonth = getDaysInUTCMonth(targetYear, startMonth);
        targetDay = Math.min(anchorDay, maxDaysInTargetMonth);
      }

      periodEnd = new Date(
        Date.UTC(
          targetYear,
          startMonth,
          targetDay,
          startHour,
          startMinute,
          startSecond,
          startMs
        )
      );
      break;
    }

    default:
      throw new Error(`Unsupported billing interval: ${interval}`);
  }

  return {
    periodStart,
    periodEnd,
    anchorDay,
  };
}

