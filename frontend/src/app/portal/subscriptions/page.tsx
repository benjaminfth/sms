"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { formatDate } from "@/lib/utils";
import {
  Repeat,
  Calendar,
  ArrowRight,
  Layers,
} from "lucide-react";

function getSubscriptionPriceMinor(sub: any): string {
  // 1. Calculate from subscription items if available
  if (sub.items && sub.items.length > 0) {
    let total = BigInt(0);
    for (const item of sub.items) {
      const unit = BigInt(item.unitPriceMinor || 0);
      const qty = parseFloat(item.quantity) || 1;
      total += BigInt(Math.round(Number(unit) * qty));
    }
    if (total > BigInt(0)) {
      return total.toString();
    }
  }

  // 2. Fall back to plan prices if attached to a plan
  if (sub.plan?.prices && sub.plan.prices.length > 0) {
    const matchingPrice =
      sub.plan.prices.find((p: any) => p.billingInterval === sub.billingInterval) ||
      sub.plan.prices[0];

    const amount = matchingPrice?.amountMinor ?? matchingPrice?.priceMinor;
    if (amount) {
      return amount.toString();
    }
  }

  return "0";
}

function getSubscriptionTitle(sub: any): string {
  if (sub.plan?.name) return sub.plan.name;
  if (sub.items && sub.items.length > 0) {
    const names = sub.items
      .map((it: any) => it.product?.name)
      .filter(Boolean);
    if (names.length > 0) {
      return names.join(", ");
    }
  }
  return "Enterprise Subscription";
}

export default function CustomerSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubscriptions() {
      setLoading(true);
      try {
        const res = await api.get<any[]>("/portal/subscriptions");
        if (res.success && res.data) {
          setSubscriptions(res.data);
        }
      } catch (err) {
        console.error("Failed to load subscriptions:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSubscriptions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-[#E5EAF1]">
        <h1 className="text-[26px] font-semibold tracking-tight text-[#172033] leading-tight">
          My Subscriptions
        </h1>
        <p className="mt-1 text-[13px] text-[#64748B]">
          Manage your enterprise software subscriptions, plan entitlements and renewal schedules.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#94A3B8]">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#315CF5] border-t-transparent" />
          <p className="mt-2 text-[12px] text-[#64748B]">Loading your active contracts...</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-white rounded-[10px] border border-[#E5EAF1] p-12 text-center shadow-xs">
          <div className="w-10 h-10 rounded-[8px] bg-[#F8FAFC] border border-[#E5EAF1] flex items-center justify-center mx-auto text-[#94A3B8] mb-3">
            <Repeat className="w-5 h-5" />
          </div>
          <h3 className="text-[15px] font-semibold text-[#172033]">No active subscriptions</h3>
          <p className="text-[13px] text-[#64748B] mt-1 max-w-sm mx-auto">
            You do not currently have any active recurring subscription contracts on file.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {subscriptions.map((sub) => {
            const priceMinor = getSubscriptionPriceMinor(sub);
            const title = getSubscriptionTitle(sub);
            const interval = sub.billingInterval || "MONTHLY";

            return (
              <div
                key={sub.id}
                className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs p-5 hover:border-[#315CF5] transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between pb-3 border-b border-[#E5EAF1]">
                    <div>
                      <span className="text-[11px] font-mono text-[#64748B]">
                        {sub.subscriptionNumber}
                      </span>
                      <h3 className="text-[16px] font-semibold text-[#172033] mt-0.5">
                        {title}
                      </h3>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-[22px] font-semibold text-[#172033] font-mono">
                      <MoneyDisplay amountMinor={priceMinor} currency={sub.currency} />
                    </span>
                    <span className="text-[12px] text-[#64748B] lowercase font-mono">
                      / {sub.intervalCount > 1 ? `${sub.intervalCount} ` : ""}{interval.toLowerCase()}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5EAF1] space-y-2 text-[12px] text-[#64748B]">
                    <div className="flex items-center justify-between">
                      <span>Start Date:</span>
                      <span className="font-mono text-[#172033]">
                        {sub.currentPeriodStart
                          ? formatDate(sub.currentPeriodStart)
                          : sub.createdAt
                          ? formatDate(sub.createdAt)
                          : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Next Billing Date:</span>
                      <span className="font-mono font-medium text-[#315CF5]">
                        {sub.nextBillingDate ? formatDate(sub.nextBillingDate) : "None scheduled"}
                      </span>
                    </div>

                    {sub.items && sub.items.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] uppercase tracking-wider text-[#94A3B8] block mb-1.5">
                          Included Offerings:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {sub.items.map((it: any) => (
                            <span
                              key={it.id}
                              className="px-2 py-0.5 bg-[#F8FAFC] border border-[#E5EAF1] rounded-[4px] text-[11px] text-[#172033]"
                            >
                              {it.product?.name || "Core Module"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E5EAF1] flex items-center justify-between">
                  <span className="text-[11px] text-[#94A3B8]">
                    {sub.invoices?.length || 0} invoice(s) on file
                  </span>
                  <Link
                    href={`/portal/subscriptions/${sub.id}`}
                    className="inline-flex items-center text-[12px] font-medium text-[#315CF5] hover:text-[#2549D8]"
                  >
                    <span>View Subscription</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
