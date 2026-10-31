import React from "react";
import { formatMoney } from "@/lib/utils";

interface MoneyDisplayProps {
  amountMinor: string | number | bigint;
  currency?: string;
  className?: string;
}

export function MoneyDisplay({
  amountMinor,
  currency = "INR",
  className = "",
}: MoneyDisplayProps) {
  return (
    <span className={`font-medium tabular-nums ${className}`}>
      {formatMoney(amountMinor, currency)}
    </span>
  );
}
