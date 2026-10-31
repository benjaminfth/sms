import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const norm = (status || "").toUpperCase();

  let styles = "bg-slate-100 text-slate-700 border-slate-200";

  if (["ACTIVE", "COMPLETED", "PAID"].includes(norm)) {
    styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (["TRIALING", "PENDING", "ISSUED", "PROCESSING"].includes(norm)) {
    styles = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (["PAST_DUE", "PARTIALLY_PAID", "SURCHARGE"].includes(norm)) {
    styles = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (["CANCELLED", "EXPIRED", "FAILED", "VOID", "OVERDUE", "ARCHIVED", "INACTIVE"].includes(norm)) {
    styles = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (["DRAFT"].includes(norm)) {
    styles = "bg-slate-100 text-slate-600 border-slate-200";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase",
        styles,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {status}
    </span>
  );
}
