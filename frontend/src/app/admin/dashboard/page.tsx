"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { api } from "@/lib/api-client";
import {
  Users,
  Repeat,
  Receipt,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Scale,
  Calendar,
  Layers,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { DashboardOverviewDTO, RevenueAnalyticsDTO } from "@sms/shared";

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<string>("30d");
  const [overview, setOverview] = useState<DashboardOverviewDTO | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [subscriptionsData, setSubscriptionsData] = useState<any>(null);
  const [invoicesData, setInvoicesData] = useState<any>(null);
  const [paymentMethodsData, setPaymentMethodsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [overviewRes, revenueRes, subsRes, invRes, methodsRes] = await Promise.all([
          api.get<DashboardOverviewDTO>("/dashboard/overview", { period }),
          api.get<RevenueAnalyticsDTO>("/dashboard/revenue", { period }),
          api.get<any>("/dashboard/subscriptions"),
          api.get<any>("/dashboard/invoices"),
          api.get<any>("/dashboard/payment-methods"),
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
          setInvoicesData(invRes.data);
        }

        if (methodsRes.success && methodsRes.data) {
          setPaymentMethodsData(methodsRes.data);
        }
      } catch (err) {
        console.error("Failed to load live dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [period]);

  return (
    <DashboardShell>
      <PageHeader
        title="Admin Executive Financial Dashboard"
        description="Authoritative revenue analytics, collected cash flows, and subscription telemetry"
      >
        <div className="flex items-center space-x-2">
          {/* Period selector */}
          <div className="bg-white border border-slate-200 rounded-lg p-0.5 flex text-xs font-semibold text-slate-600">
            {[
              { label: "7D", val: "7d" },
              { label: "30D", val: "30d" },
              { label: "90D", val: "90d" },
              { label: "1Y", val: "1y" },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => setPeriod(p.val)}
                className={`px-3 py-1.5 rounded-md transition ${
                  period === p.val
                    ? "bg-brand-600 text-white shadow-xs"
                    : "hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Link
            href="/admin/payments/new"
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Record Payment
          </Link>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Card 1: Collected Cash Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Collected Cash</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            <MoneyDisplay amountMinor={overview?.totalCollectedRevenueMinor || "0"} />
          </div>
          <span className="text-xs text-emerald-600 font-medium inline-flex items-center mt-1">
            Settled via payment allocations
          </span>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500" />
        </div>

        {/* Card 2: Invoiced Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Invoiced Total</span>
            <div className="p-2 bg-blue-50 text-brand-600 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            <MoneyDisplay amountMinor={overview?.totalInvoicedRevenueMinor || "0"} />
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Across {overview?.totalInvoicesCount || 0} issued invoices
          </span>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-brand-500" />
        </div>

        {/* Card 3: Outstanding Receivables */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Outstanding Balance</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono">
            <MoneyDisplay amountMinor={overview?.totalOutstandingRevenueMinor || "0"} />
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {overview?.outstandingInvoicesCount || 0} open • {overview?.overdueInvoicesCount || 0} overdue
          </span>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-500" />
        </div>

        {/* Card 4: Active Subscriptions & Customers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Subscribers</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {overview?.activeSubscriptions || 0}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {overview?.totalCustomers || 0} total customers
          </span>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-indigo-500" />
        </div>
      </div>

      {/* Main Revenue Chart: Collected Cash vs Invoiced Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Revenue Invoiced vs Cash Collected
              </h3>
              <p className="text-xs text-slate-500">
                Historical comparison based on active invoices and settled transactions
              </p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <span className="flex items-center text-brand-600">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-600 mr-1.5" />
                Invoiced (₹)
              </span>
              <span className="flex items-center text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5" />
                Collected (₹)
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `₹${Number(value).toLocaleString("en-IN")}`,
                    name === "invoiced" ? "Invoiced Total" : "Collected Cash",
                  ]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="invoiced"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorInv)"
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCol)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Payment Methods Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900">Payment Channels</h3>
              </div>
              <span className="text-xs text-slate-400">By volume</span>
            </div>

            <div className="space-y-3">
              {paymentMethodsData?.methods?.map((m: any) => (
                <div key={m.method} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-800 uppercase font-mono">{m.method}</span>
                    <span className="font-bold text-slate-900 font-mono">
                      ₹{(Number(m.totalAmountMinor) / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{m.count} completed transactions</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <Link
              href="/admin/reconciliation"
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              <Scale className="w-3.5 h-3.5 text-slate-500" />
              <span>Open Reconciliation Console</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Subscription Breakdown & Quick Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link
          href="/admin/taxes"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-brand-500 transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition">
              Tax Rules & GST
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition" />
          </div>
          <p className="text-xs text-slate-500">
            Configure inclusive/exclusive tax rates and product tax assignments.
          </p>
        </Link>

        <Link
          href="/admin/discounts"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-brand-500 transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition">
              Discounts & Promos
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition" />
          </div>
          <p className="text-xs text-slate-500">
            Manage percentage codes, fixed discounts, and view redemption audit trails.
          </p>
        </Link>

        <Link
          href="/admin/payments"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-brand-500 transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition">
              Payments Ledger
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition" />
          </div>
          <p className="text-xs text-slate-500">
            View completed receipts, record manual payments, and audit allocations.
          </p>
        </Link>

        <Link
          href="/admin/reconciliation"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-brand-500 transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition">
              Reconciliation
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition" />
          </div>
          <p className="text-xs text-slate-500">
            Match unallocated customer deposits and clear outstanding invoice balances.
          </p>
        </Link>
      </div>
    </DashboardShell>
  );
}
