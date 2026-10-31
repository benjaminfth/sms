import { BillingInterval } from "@sms/shared";
import {
  calculateNextBillingPeriod,
  getDaysInMonthUTC,
  isLeapYear,
  isSubscriptionDueForBilling,
} from "../services/billing-period";

describe("Billing Period & Date Utilities", () => {
  describe("Leap Year and Month Day Calculations", () => {
    it("should identify leap years correctly", () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2028)).toBe(true);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2026)).toBe(false);
      expect(isLeapYear(1900)).toBe(false);
    });

    it("should return correct number of days in each month", () => {
      expect(getDaysInMonthUTC(2026, 0)).toBe(31); // Jan
      expect(getDaysInMonthUTC(2026, 1)).toBe(28); // Feb non-leap
      expect(getDaysInMonthUTC(2024, 1)).toBe(29); // Feb leap year
      expect(getDaysInMonthUTC(2026, 3)).toBe(30); // Apr
      expect(getDaysInMonthUTC(2026, 6)).toBe(31); // Jul
      expect(getDaysInMonthUTC(2026, 7)).toBe(31); // Aug
    });
  });

  describe("DAILY Billing Interval", () => {
    it("should calculate correct daily billing period", () => {
      const start = new Date(Date.UTC(2026, 9, 1, 10, 0, 0)); // 1 Oct 2026
      const result = calculateNextBillingPeriod(start, BillingInterval.DAILY, 1);

      expect(result.periodStart.toISOString()).toBe("2026-10-01T10:00:00.000Z");
      expect(result.periodEnd.toISOString()).toBe("2026-10-02T10:00:00.000Z");
      expect(result.nextBillingDate.toISOString()).toBe("2026-10-02T10:00:00.000Z");
    });
  });

  describe("WEEKLY Billing Interval", () => {
    it("should calculate correct weekly billing period (7 days)", () => {
      const start = new Date(Date.UTC(2026, 9, 1, 10, 0, 0)); // 1 Oct 2026
      const result = calculateNextBillingPeriod(start, BillingInterval.WEEKLY, 1);

      expect(result.periodStart.toISOString()).toBe("2026-10-01T10:00:00.000Z");
      expect(result.periodEnd.toISOString()).toBe("2026-10-08T10:00:00.000Z");
      expect(result.nextBillingDate.toISOString()).toBe("2026-10-08T10:00:00.000Z");
    });
  });

  describe("MONTHLY Billing Interval with Anchor Day Preservation", () => {
    it("should calculate standard monthly billing period", () => {
      const start = new Date(Date.UTC(2026, 9, 1, 0, 0, 0)); // 1 Oct 2026
      const result = calculateNextBillingPeriod(start, BillingInterval.MONTHLY, 1);

      expect(result.periodEnd.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    });

    it("should preserve January 31 anchor day across February and return to 31 in March", () => {
      // 1. Jan 31 -> Feb 28 in non-leap year 2026
      const jan31 = new Date(Date.UTC(2026, 0, 31, 12, 0, 0)); // 31 Jan 2026
      const anchor = 31;
      const febResult = calculateNextBillingPeriod(jan31, BillingInterval.MONTHLY, 1, anchor);

      expect(febResult.periodStart.getUTCDate()).toBe(31);
      expect(febResult.periodEnd.getUTCMonth()).toBe(1); // Feb
      expect(febResult.periodEnd.getUTCDate()).toBe(28); // Feb 28

      // 2. Feb 28 -> March 31 (retains 31st anchor!)
      const marResult = calculateNextBillingPeriod(febResult.periodEnd, BillingInterval.MONTHLY, 1, anchor);
      expect(marResult.periodEnd.getUTCMonth()).toBe(2); // Mar
      expect(marResult.periodEnd.getUTCDate()).toBe(31); // Returns to 31!

      // 3. March 31 -> April 30 (April has 30 days)
      const aprResult = calculateNextBillingPeriod(marResult.periodEnd, BillingInterval.MONTHLY, 1, anchor);
      expect(aprResult.periodEnd.getUTCMonth()).toBe(3); // Apr
      expect(aprResult.periodEnd.getUTCDate()).toBe(30);

      // 4. April 30 -> May 31 (May has 31 days)
      const mayResult = calculateNextBillingPeriod(aprResult.periodEnd, BillingInterval.MONTHLY, 1, anchor);
      expect(mayResult.periodEnd.getUTCMonth()).toBe(4); // May
      expect(mayResult.periodEnd.getUTCDate()).toBe(31);
    });

    it("should handle Leap Year February 29 correctly", () => {
      const jan31 = new Date(Date.UTC(2024, 0, 31, 0, 0, 0)); // 2024 is a leap year
      const febResult = calculateNextBillingPeriod(jan31, BillingInterval.MONTHLY, 1, 31);
      expect(febResult.periodEnd.getUTCMonth()).toBe(1); // Feb
      expect(febResult.periodEnd.getUTCDate()).toBe(29); // 29 Feb in leap year
    });
  });

  describe("YEARLY Billing Interval", () => {
    it("should calculate standard yearly billing period", () => {
      const start = new Date(Date.UTC(2026, 9, 1, 0, 0, 0)); // 1 Oct 2026
      const result = calculateNextBillingPeriod(start, BillingInterval.YEARLY, 1);

      expect(result.periodEnd.toISOString()).toBe("2027-10-01T00:00:00.000Z");
    });

    it("should handle Feb 29 leap year anchor transitioning to non-leap year", () => {
      const feb29 = new Date(Date.UTC(2024, 1, 29, 0, 0, 0)); // 29 Feb 2024
      const result = calculateNextBillingPeriod(feb29, BillingInterval.YEARLY, 1, 29);

      expect(result.periodEnd.getUTCFullYear()).toBe(2025);
      expect(result.periodEnd.getUTCMonth()).toBe(1); // Feb
      expect(result.periodEnd.getUTCDate()).toBe(28); // 28 Feb in 2025
    });
  });

  describe("isSubscriptionDueForBilling", () => {
    it("should return true when next billing date is in the past or now", () => {
      const past = new Date(Date.now() - 3600000);
      expect(isSubscriptionDueForBilling(past)).toBe(true);

      const now = new Date();
      expect(isSubscriptionDueForBilling(now)).toBe(true);
    });

    it("should return false when next billing date is in the future", () => {
      const future = new Date(Date.now() + 86400000);
      expect(isSubscriptionDueForBilling(future)).toBe(false);
    });
  });
});

