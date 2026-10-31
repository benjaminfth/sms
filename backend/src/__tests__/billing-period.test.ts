import { BillingInterval } from "@sms/shared";
import { calculateBillingPeriod, isLeapYear } from "../services/billing-period";

describe("Billing Period Calculation Utility Tests", () => {
  describe("Leap Year Utility", () => {
    it("should accurately identify leap years", () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2028)).toBe(true);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2026)).toBe(false);
      expect(isLeapYear(2100)).toBe(false);
    });
  });

  describe("DAILY Billing Interval", () => {
    it("should calculate correct 1-day billing period", () => {
      const start = new Date("2026-10-01T00:00:00.000Z");
      const result = calculateBillingPeriod(start, BillingInterval.DAILY, 1);

      expect(result.periodStart.toISOString()).toBe("2026-10-01T00:00:00.000Z");
      expect(result.periodEnd.toISOString()).toBe("2026-10-02T00:00:00.000Z");
      expect(result.anchorDay).toBe(1);
    });

    it("should handle month boundaries in daily cycles", () => {
      const start = new Date("2026-10-31T00:00:00.000Z");
      const result = calculateBillingPeriod(start, BillingInterval.DAILY, 1);

      expect(result.periodEnd.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    });
  });

  describe("WEEKLY Billing Interval", () => {
    it("should calculate correct 7-day billing period", () => {
      const start = new Date("2026-10-01T00:00:00.000Z");
      const result = calculateBillingPeriod(start, BillingInterval.WEEKLY, 1);

      expect(result.periodStart.toISOString()).toBe("2026-10-01T00:00:00.000Z");
      expect(result.periodEnd.toISOString()).toBe("2026-10-08T00:00:00.000Z");
    });

    it("should support multi-week periods (bi-weekly)", () => {
      const start = new Date("2026-10-01T00:00:00.000Z");
      const result = calculateBillingPeriod(start, BillingInterval.WEEKLY, 2);

      expect(result.periodEnd.toISOString()).toBe("2026-10-15T00:00:00.000Z");
    });
  });

  describe("MONTHLY Billing Interval", () => {
    it("should calculate standard monthly billing period: 1 October -> 1 November", () => {
      const start = new Date("2026-10-01T00:00:00.000Z");
      const result = calculateBillingPeriod(start, BillingInterval.MONTHLY, 1);

      expect(result.periodStart.toISOString()).toBe("2026-10-01T00:00:00.000Z");
      expect(result.periodEnd.toISOString()).toBe("2026-11-01T00:00:00.000Z");
      expect(result.anchorDay).toBe(1);
    });

    it("should clamp to February 28 on non-leap year (2026)", () => {
      const start = new Date("2026-01-31T00:00:00.000Z");
      const result = calculateBillingPeriod(start, BillingInterval.MONTHLY, 1);

      expect(result.periodStart.toISOString()).toBe("2026-01-31T00:00:00.000Z");
      expect(result.periodEnd.toISOString()).toBe("2026-02-28T00:00:00.000Z");
      expect(result.anchorDay).toBe(31);
    });

    it("should clamp to February 29 on leap year (2024)", () => {
      const start = new Date("2024-01-31T00:00:00.000Z");
      const result = calculateBillingPeriod(start, BillingInterval.MONTHLY, 1);

      expect(result.periodStart.toISOString()).toBe("2024-01-31T00:00:00.000Z");
      expect(result.periodEnd.toISOString()).toBe("2024-02-29T00:00:00.000Z");
      expect(result.anchorDay).toBe(31);
    });

    it("should restore original 31st anchor day in March after clamping in February", () => {
      // Step 1: Jan 31 -> Feb 28 (anchor preserved as 31)
      const janStart = new Date("2026-01-31T00:00:00.000Z");
      const febResult = calculateBillingPeriod(janStart, BillingInterval.MONTHLY, 1);
      expect(febResult.periodEnd.toISOString()).toBe("2026-02-28T00:00:00.000Z");

      // Step 2: Next period uses Feb 28 as start, but preserves anchorDay 31 -> March 31!
      const marResult = calculateBillingPeriod(
        febResult.periodEnd,
        BillingInterval.MONTHLY,
        1,
        febResult.anchorDay
      );
      expect(marResult.periodEnd.toISOString()).toBe("2026-03-31T00:00:00.000Z");
      expect(marResult.anchorDay).toBe(31);

      // Step 3: March 31 -> April 30 (30 days in April)
      const aprResult = calculateBillingPeriod(
        marResult.periodEnd,
        BillingInterval.MONTHLY,
        1,
        marResult.anchorDay
      );
      expect(aprResult.periodEnd.toISOString()).toBe("2026-04-30T00:00:00.000Z");

      // Step 4: April 30 -> May 31 (returns to 31)
      const mayResult = calculateBillingPeriod(
        aprResult.periodEnd,
        BillingInterval.MONTHLY,
        1,
        aprResult.anchorDay
      );
      expect(mayResult.periodEnd.toISOString()).toBe("2026-05-31T00:00:00.000Z");
    });

    it("should handle year wrap-around: December -> January", () => {
      const start = new Date("2026-12-15T00:00:00.000Z");
      const result = calculateBillingPeriod(start, BillingInterval.MONTHLY, 1);

      expect(result.periodEnd.toISOString()).toBe("2027-01-15T00:00:00.000Z");
    });
  });

  describe("YEARLY Billing Interval", () => {
    it("should calculate correct yearly billing period: 1 October 2026 -> 1 October 2027", () => {
      const start = new Date("2026-10-01T00:00:00.000Z");
      const result = calculateBillingPeriod(start, BillingInterval.YEARLY, 1);

      expect(result.periodStart.toISOString()).toBe("2026-10-01T00:00:00.000Z");
      expect(result.periodEnd.toISOString()).toBe("2027-10-01T00:00:00.000Z");
    });

    it("should handle leap year anchor: Feb 29 2024 -> Feb 28 2025 -> Feb 29 2028", () => {
      const leapStart = new Date("2024-02-29T00:00:00.000Z");
      const y1 = calculateBillingPeriod(leapStart, BillingInterval.YEARLY, 1);
      expect(y1.periodEnd.toISOString()).toBe("2025-02-28T00:00:00.000Z");
      expect(y1.anchorDay).toBe(29);

      // Preserving anchor across 4 years returns to Feb 29
      const y4 = calculateBillingPeriod(leapStart, BillingInterval.YEARLY, 4, 29);
      expect(y4.periodEnd.toISOString()).toBe("2028-02-29T00:00:00.000Z");
    });
  });
});

