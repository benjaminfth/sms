"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { CustomerPortalOverviewDTO } from "@sms/shared";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  CreditCard,
  Repeat,
  Receipt,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function CustomerPortalOverviewPage() {
  const [data, setData] = useState<CustomerPortalOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      try {
        const res = await api.get<CustomerPortalOverviewDTO>("/portal/overview");
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Failed to load customer portal overview:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOverview();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-[#94A3B8]">
        <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#315CF5] border-t-transparent" />
        <p className="text-[12px] text-[#64748B] mt-2 font-medium">Loading account overview...</p>
      </div>
    );
  }

  const outstandingPaise = BigInt(data?.totalOutstandingBalanceMinor || 0);
  const outstandingRupees = (Number(outstandingPaise) / 100).toLocaleString("en-IN");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-5 border-b border-[#E5EAF1] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-[#172033] leading-tight">
            Account Overview
          </h1>
          <p className="mt-1 text-[13px] text-[#64748B]">
            Welcome back! Monitor your active subscriptions, invoices and payment receipts.
          </p>
        </div>

        {outstandingPaise > BigInt(0) && (
          <Link
            href="/portal/invoices"
            className="inline-flex items-center px-4 py-2 rounded-[8px] text-[13px] font-medium bg-[#315CF5] text-white hover:bg-[#2549D8] shadow-xs transition"
          >
            Pay Outstanding (₹{outstandingRupees})
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Outstanding Balance */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1.5">
              <span>Outstanding Balance</span>
              <CreditCard className="w-4 h-4 text-[#94A3B8]" />
            </div>
            <div className="text-[26px] font-semibold tracking-tight text-[#172033] font-mono">
              ₹{outstandingRupees}
            </div>
            <p className="text-[12px] text-[#64748B] mt-1">
              {outstandingPaise > BigInt(0)
                ? "Immediate settlement ensures uninterrupted access"
                : "All invoices are fully settled"}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E5EAF1]">
            <Link
              href="/portal/invoices"
              className="text-[12px] font-medium text-[#315CF5] hover:text-[#2549D8] flex items-center space-x-1"
            >
              <span>View all invoices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1.5">
              <span>Active Subscriptions</span>
              <Repeat className="w-4 h-4 text-[#94A3B8]" />
            </div>
            <div className="text-[26px] font-semibold tracking-tight text-[#172033] font-mono">
              {data?.activeSubscriptions?.length || 0}
            </div>
            <p className="text-[12px] text-[#64748B] mt-1 truncate">
              {data?.activeSubscriptions?.[0]?.plan?.name || "Standard Subscription"}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E5EAF1]">
            <Link
              href="/portal/subscriptions"
              className="text-[12px] font-medium text-[#315CF5] hover:text-[#2549D8] flex items-center space-x-1"
            >
              <span>Manage subscriptions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Next Renewal Date */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1.5">
              <span>Next Billing Date</span>
              <Calendar className="w-4 h-4 text-[#94A3B8]" />
            </div>
            <div className="text-[20px] font-semibold tracking-tight text-[#172033] font-mono">
              {data?.upcomingBillingDate
                ? new Date(data.upcomingBillingDate).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "No renewals scheduled"}
            </div>
            <p className="text-[12px] text-[#64748B] mt-1">
              Recurring automated invoicing on calendar cycle
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E5EAF1]">
            <Link
              href="/portal/invoices"
              className="text-[12px] font-medium text-[#64748B] hover:text-[#172033] flex items-center space-x-1"
            >
              <span>Billing history</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Invoices & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-[#315CF5]" />
              <h2 className="text-[14px] font-semibold text-[#172033]">Recent Invoices</h2>
            </div>
            <Link
              href="/portal/invoices"
              className="text-[12px] font-medium text-[#315CF5] hover:text-[#2549D8]"
            >
              View all ({data?.recentInvoices?.length || 0})
            </Link>
          </div>

          <div className="overflow-x-auto">
            {data?.recentInvoices?.length === 0 ? (
              <p className="text-[12px] text-[#94A3B8] py-8 text-center">No invoices issued yet.</p>
            ) : (
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                    <th className="py-2 px-4">Invoice #</th>
                    <th className="py-2 px-4">Due Date</th>
                    <th className="py-2 px-4 text-right">Amount</th>
                    <th className="py-2 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF1]">
                  {data?.recentInvoices?.map((inv: any) => {
                    const total = (Number(inv.totalAmountMinor) / 100).toLocaleString("en-IN");
                    return (
                      <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium">
                          <Link href={`/portal/invoices/${inv.id}`} className="text-[#315CF5] hover:underline">
                            #{inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[#64748B]">
                          {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-[#172033]">
                          ₹{total}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <StatusBadge status={inv.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-[#16865B]" />
              <h2 className="text-[14px] font-semibold text-[#172033]">Recent Payments</h2>
            </div>
            <Link
              href="/portal/payments"
              className="text-[12px] font-medium text-[#315CF5] hover:text-[#2549D8]"
            >
              View all ({data?.recentPayments?.length || 0})
            </Link>
          </div>

          <div className="overflow-x-auto">
            {data?.recentPayments?.length === 0 ? (
              <p className="text-[12px] text-[#94A3B8] py-8 text-center">No payment transactions recorded.</p>
            ) : (
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                    <th className="py-2 px-4">Reference</th>
                    <th className="py-2 px-4">Method & Date</th>
                    <th className="py-2 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF1]">
                  {data?.recentPayments?.map((pay: any) => {
                    const amt = (Number(pay.amountMinor) / 100).toLocaleString("en-IN");
                    return (
                      <tr key={pay.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-[#172033]">
                          {pay.paymentReference}
                        </td>
                        <td className="py-2.5 px-4 text-[#64748B]">
                          <span className="font-mono text-[11px] uppercase mr-1">{pay.paymentMethod}</span>
                          • {new Date(pay.paidAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-[#16865B]">
                          ₹{amt}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
