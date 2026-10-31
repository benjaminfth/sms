import { PaymentTerms } from "@sms/shared";

/**
 * Calculates the due date for an invoice or quotation based on agreed payment terms.
 * - DUE_IMMEDIATELY: Due on the same day (0 days offset)
 * - NET_7: Due in 7 days
 * - NET_15: Due in 15 days (default)
 * - NET_30: Due in 30 days
 */
export function calculateDueDateFromPaymentTerms(
  baseDate: Date = new Date(),
  terms: PaymentTerms | string = "NET_15"
): Date {
  const due = new Date(baseDate.getTime());

  switch (terms) {
    case "DUE_IMMEDIATELY":
      // Due immediately (same day, end of day or current timestamp)
      return due;

    case "NET_7":
      due.setUTCDate(due.getUTCDate() + 7);
      return due;

    case "NET_30":
      due.setUTCDate(due.getUTCDate() + 30);
      return due;

    case "NET_15":
    default:
      due.setUTCDate(due.getUTCDate() + 15);
      return due;
  }
}

