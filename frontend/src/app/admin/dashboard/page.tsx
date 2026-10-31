"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import {
  Users,
  Repeat,
  Receipt,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Scale,
  Calendar,
  Layers,
  ArrowUpRight,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  DashboardOverviewDTO,
  RevenueAnalyticsDTO,
  SubscriptionAnalyticsDTO,
  InvoiceWithDetailsDTO,
  PaymentDTO,
  SubscriptionWithDetailsDTO,
} from "@sms/shared";

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<string>("30d");
  const [overview, setOverview] = useState<DashboardOverviewDTO | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [subscriptionsData, setSubscriptionsData] = useState<SubscriptionAnalyticsDTO | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<InvoiceWithDetailsDTO[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentDTO[]>([]);
  const [recentSubscriptions, setRecentSubscriptions] = useState<SubscriptionWithDetailsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [overviewRes, revenueRes, subsRes, invRes, payRes, recentSubsRes] = await Promise.all([
        api.get<DashboardOverviewDTO>("/dashboard/overview", { period }),
        api.get<RevenueAnalyticsDTO>("/dashboard/revenue", { period }),
        api.get<SubscriptionAnalyticsDTO>("/dashboard/subscriptions"),
        api.get<InvoiceWithDetailsDTO[]>("/invoices", { pageSize: 5 }),
        api.get<PaymentDTO[]>("/payments", { pageSize: 5 }),
        api.get<SubscriptionWithDetailsDTO[]>("/subscriptions", { pageSize: 5 }),
      ]);

      if (overviewRes.success && overviewRes.data) {
        setOverview(overviewRes.data);
      }

      if (revenueRes.success && revenueRes.data) {
        const formatted = revenueRes.data.points.map((p) => ({
          date: p.date,
          invoiced: Number(p.invoicedMinor) / 100,
          collected: Number(p.collectedMinor) / 100,
        }));
        setRevenueData(formatted);
      }

      if (subsRes.success && subsRes.data) {
        setSubscriptionsData(subsRes.data);
      }

      if (invRes.success && invRes.data) {
        setRecentInvoices(invRes.data);
      }

      if (payRes.success && payRes.data) {
        setRecentPayments(payRes.data);
      }

      if (recentSubsRes.success && recentSubsRes.data) {
        setRecentSubscriptions(recentSubsRes.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <DashboardShell>
      <PageHeader
        title="Overview"
        description="Monitor subscriptions, billing activity and revenue performance."
      >
        <div className="flex items-center space-x-2.5">
          {/* Period selector */}
          <div className="bg-white border border-[#E5EAF1] rounded-[8px] p-0.5 flex text-[12px] font-medium text-[#64748B] shadow-xs">
            {[
              { label: "7D", val: "7d" },
              { label: "30D", val: "30d" },
              { label: "90D", val: "90d" },
              { label: "1Y", val: "1y" },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => setPeriod(p.val)}
                className={`px-2.5 py-1 rounded-[6px] transition-colors ${
                  period === p.val
                    ? "bg-[#172033] text-white"
                    : "hover:text-[#172033] hover:bg-[#F8FAFC]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Refresh action */}
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            title="Refresh Metrics"
            className="p-2 bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] rounded-[8px] transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#315CF5]" : ""}`} />
          </button>
        </div>
      </PageHeader>

      {/* 4 Compact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* KPI 1: Monthly Recurring / Invoiced */}
        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1.5">
            <span>Monthly Recurring Revenue</span>
            <Repeat className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <div className="text-[24px] font-semibold tracking-tight text-[#172033] font-mono">
            {overview ? (
              <MoneyDisplay
                amountMinor={overview.totalInvoicedRevenueMinor}
                currency={overview.currency}
              />
            ) : (
              <span className="text-[#94A3B8]">—</span>
            )}
          </div>
          <div className="mt-2 flex items-center text-[11px] text-[#64748B]">
            <span className="text-[#16865B] font-medium mr-1.5 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16865B] mr-1" />
              Active
            </span>
            <span>Based on recurring contracts</span>
          </div>
        </div>

        {/* KPI 2: Active Subscriptions */}
        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1.5">
            <span>Active Subscriptions</span>
            <Users className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <div className="text-[24px] font-semibold tracking-tight text-[#172033] font-mono">
            {overview ? overview.activeSubscriptions : "—"}
          </div>
          <div className="mt-2 flex items-center text-[11px] text-[#64748B]">
            {overview && overview.newSubscriptionsCount > 0 ? (
              <span className="text-[#16865B] font-medium mr-1.5">
                +{overview.newSubscriptionsCount} new
              </span>
            ) : null}
            <span>{overview?.cancelledSubscriptionsCount || 0} cancelled this period</span>
          </div>
        </div>

        {/* KPI 3: Revenue Collected */}
        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1.5">
            <span>Revenue Collected</span>
            <Receipt className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <div className="text-[24px] font-semibold tracking-tight text-[#16865B] font-mono">
            {overview ? (
              <MoneyDisplay
                amountMinor={overview.totalCollectedRevenueMinor}
                currency={overview.currency}
              />
            ) : (
              <span className="text-[#94A3B8]">—</span>
            )}
          </div>
          <div className="mt-2 flex items-center text-[11px] text-[#64748B]">
            <span className="text-[#172033] font-medium mr-1">
              {overview?.paidInvoicesCount || 0}
            </span>
            <span>settled invoices</span>
          </div>
        </div>

        {/* KPI 4: Outstanding Balance */}
        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1.5">
            <span>Outstanding Balance</span>
            <CreditCard className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <div className="text-[24px] font-semibold tracking-tight text-[#C58A24] font-mono">
            {overview ? (
              <MoneyDisplay
                amountMinor={overview.totalOutstandingRevenueMinor}
                currency={overview.currency}
              />
            ) : (
              <span className="text-[#94A3B8]">—</span>
            )}
          </div>
          <div className="mt-2 flex items-center text-[11px] text-[#64748B]">
            {overview && overview.overdueInvoicesCount > 0 ? (
              <span className="text-[#D14343] font-medium mr-1">
                {overview.overdueInvoicesCount} overdue
              </span>
            ) : (
              <span className="text-[#64748B] mr-1">
                {overview?.outstandingInvoicesCount || 0} pending
              </span>
            )}
            <span>awaiting settlement</span>
          </div>
        </div>
      </div>

      {/* Analytics Section: 2-Column Balanced Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left: Revenue Over Time (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5EAF1]">
            <div>
              <h2 className="text-[14px] font-semibold text-[#172033]">
                Revenue & Cash Flow
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Invoiced revenue vs settled collections across selected period
              </p>
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-medium">
              <span className="flex items-center text-[#315CF5]">
                <span className="w-2 h-2 rounded-full bg-[#315CF5] mr-1.5" />
                Invoiced
              </span>
              <span className="flex items-center text-[#16865B]">
                <span className="w-2 h-2 rounded-full bg-[#16865B] mr-1.5" />
                Collected
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="invGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#315CF5" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#315CF5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16865B" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#16865B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="date"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#E5EAF1" }}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#E5EAF1" }}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `₹${Number(value).toLocaleString("en-IN")}`,
                    name === "invoiced" ? "Invoiced" : "Collected",
                  ]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    border: "1px solid #E5EAF1",
                    boxShadow: "0 4px 12px rgba(23, 32, 51, 0.06)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="invoiced"
                  stroke="#315CF5"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#invGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="#16865B"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Plan Distribution / Subscriptions Breakdown */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5EAF1]">
              <div>
                <h2 className="text-[14px] font-semibold text-[#172033]">
                  Subscription Distribution
                </h2>
                <p className="text-[12px] text-[#64748B] mt-0.5">By active plan tiers</p>
              </div>
              <Link
                href="/admin/plans"
                className="text-[11px] font-medium text-[#315CF5] hover:text-[#2549D8]"
              >
                View Plans
              </Link>
            </div>

            <div className="space-y-2.5">
              {subscriptionsData?.byPlan && subscriptionsData.byPlan.length > 0 ? (
                subscriptionsData.byPlan.map((p) => (
                  <div
                    key={p.planId}
                    className="p-2.5 bg-[#F8FAFC] rounded-[8px] border border-[#E5EAF1] text-[12px] flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-[#172033] truncate">{p.planName}</p>
                    </div>
                    <span className="font-mono font-medium text-[#172033] text-[12px] shrink-0">
                      {p.count} active
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-[#94A3B8] text-[12px]">
                  No plan breakdown available.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5EAF1] mt-4">
            <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
              <div className="p-2 bg-[#F8FAFC] rounded-[6px] border border-[#E5EAF1]">
                <p className="text-[#64748B]">Trialing</p>
                <p className="font-semibold text-[#3978C8] text-[13px] font-mono mt-0.5">
                  {subscriptionsData?.trialingCount || 0}
                </p>
              </div>
              <div className="p-2 bg-[#F8FAFC] rounded-[6px] border border-[#E5EAF1]">
                <p className="text-[#64748B]">Past Due</p>
                <p className="font-semibold text-[#C58A24] text-[13px] font-mono mt-0.5">
                  {subscriptionsData?.pastDueCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Section: Compact Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-[#172033]">Recent Invoices</h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">Latest billing invoices issued</p>
            </div>
            <Link
              href="/admin/invoices"
              className="text-[12px] font-medium text-[#315CF5] hover:text-[#2549D8] flex items-center space-x-1"
            >
              <span>All Invoices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                  <th className="py-2 px-4">Invoice #</th>
                  <th className="py-2 px-4">Customer</th>
                  <th className="py-2 px-4 text-right">Amount</th>
                  <th className="py-2 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#94A3B8]">
                      No recent invoices.
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium">
                        <Link
                          href={`/admin/invoices/${inv.id}`}
                          className="text-[#315CF5] hover:text-[#2549D8]"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-[#172033] max-w-[140px] truncate">
                        {inv.customer?.fullName || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium text-[#172033]">
                        <MoneyDisplay amountMinor={inv.totalAmountMinor} currency={inv.currency} />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-[#172033]">Recent Payments</h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">Cleared customer collections</p>
            </div>
            <Link
              href="/admin/payments"
              className="text-[12px] font-medium text-[#315CF5] hover:text-[#2549D8] flex items-center space-x-1"
            >
              <span>Payments Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                  <th className="py-2 px-4">Reference</th>
                  <th className="py-2 px-4">Method</th>
                  <th className="py-2 px-4 text-right">Amount</th>
                  <th className="py-2 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#94A3B8]">
                      No recent payments.
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium">
                        <Link
                          href={`/admin/payments/${p.id}`}
                          className="text-[#315CF5] hover:text-[#2549D8]"
                        >
                          {p.paymentReference}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-[#64748B] uppercase font-mono text-[11px]">
                        {p.paymentMethod}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium text-[#16865B]">
                        <MoneyDisplay amountMinor={p.amountMinor} currency={p.currency} />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
