import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const norm = (status || "").toUpperCase();

  let styles = "bg-[#F1F5F9] text-[#64748B] border-[#E5EAF1]";

  if (["ACTIVE", "COMPLETED", "PAID", "ACCEPTED", "SUCCESS"].includes(norm)) {
    styles = "bg-[#EDF7F2] text-[#16865B] border-[#C7E8D8]";
  } else if (["PENDING", "PAST_DUE", "PARTIALLY_PAID", "SURCHARGE", "PAUSED", "UNMATCHED"].includes(norm)) {
    styles = "bg-[#FDF8ED] text-[#C58A24] border-[#F6E2B8]";
  } else if (["CANCELLED", "EXPIRED", "FAILED", "VOID", "OVERDUE", "ARCHIVED", "INACTIVE", "REJECTED"].includes(norm)) {
    styles = "bg-[#FDEDED] text-[#D14343] border-[#F8C6C6]";
  } else if (["TRIALING", "ISSUED", "PROCESSING", "SENT", "MATCHED"].includes(norm)) {
    styles = "bg-[#EEF4FC] text-[#3978C8] border-[#C8DEF6]";
  } else if (["DRAFT"].includes(norm)) {
    styles = "bg-[#F1F5F9] text-[#64748B] border-[#E5EAF1]";
  }

  // Format label for display (e.g. PARTIALLY_PAID -> Partially Paid)
  const displayLabel = status
    ? status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-[5px] text-[11px] font-medium border leading-none tracking-normal shrink-0",
        styles,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80 shrink-0" />
      <span>{displayLabel}</span>
    </span>
  );
}
