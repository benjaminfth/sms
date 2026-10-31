import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatMinorToCurrency } from "@sms/shared";

export { formatMinorToCurrency };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amountMinor: string | number | bigint, currency = "INR") {
  return formatMinorToCurrency(amountMinor, currency);
}

export function formatDate(dateString?: string | null) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}
