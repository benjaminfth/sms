"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { CustomerPortalOverviewDTO, PaymentStatus, InvoiceStatus } from "@sms/shared";
import {
  Building,
  CreditCard,
  Repeat,
  Receipt,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
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
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
        <p className="text-xs text-slate-400 mt-2 font-medium">Loading your portal account...</p>
      </div>
    );
  }

  const outstandingPaise = BigInt(data?.totalOutstandingBalanceMinor || 0);
  const outstandingRupees = (Number(outstandingPaise) / 100).toLocaleString("en-IN");

  const getStatusBadge = (status: string) => {
    if (status === "PAID") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Paid
        </span>
      );
    }
    if (status === "PARTIALLY_PAID") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
          <Clock className="w-3 h-3 mr-1" />
          Partially Paid
        </span>
      );
    }
    if (status === "OVERDUE") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Overdue
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-brand-700">
        Issued
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Welcome Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-brand-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome to Brightloop Enterprise Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {data?.customer?.companyName || data?.customer?.fullName}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Manage your cloud subscriptions, review quotations, settle invoices, and audit historical payments.
          </p>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Outstanding Balance */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Balance Due</span>
              <Receipt className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono">
              ₹{outstandingRupees}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {outstandingPaise > BigInt(0)
                ? "Immediate settlement required for active billing continuity"
                : "All invoices are fully settled!"}
            </p>
          </div>

          {outstandingPaise > BigInt(0) && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Link
                href="/portal/invoices"
                className="inline-flex items-center justify-center w-full py-2 px-4 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition"
              >
                Pay Outstanding Invoices →
              </Link>
            </div>
          )}
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Subscriptions</span>
              <Repeat className="w-4 h-4 text-brand-600" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {data?.activeSubscriptions?.length || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {data?.activeSubscriptions?.[0]?.plan?.name || "Active Tier"}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <Link
              href="/portal/subscriptions"
              className="inline-flex items-center justify-between w-full text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              <span>View Subscription Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Next Renewal Date */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Next Billing Date</span>
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {data?.upcomingBillingDate
                ? new Date(data.upcomingBillingDate).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "No renewals scheduled"}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Recurring automated invoicing on calendar cycle
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <Link
              href="/portal/invoices"
              className="inline-flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <span>View Billing History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Invoices & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Invoices */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent Invoices</h3>
              </div>
              <Link
                href="/portal/invoices"
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                View all ({data?.recentInvoices?.length || 0})
              </Link>
            </div>

            {data?.recentInvoices?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No invoices issued yet.</p>
            ) : (
              <div className="space-y-3">
                {data?.recentInvoices?.map((inv: any) => {
                  const total = (Number(inv.totalAmountMinor) / 100).toLocaleString("en-IN");
                  const balance = (Number(inv.balanceDueMinor) / 100).toLocaleString("en-IN");

                  return (
                    <div
                      key={inv.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-slate-900">#{inv.invoiceNumber}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Due: {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">₹{total}</div>
                        <div className="mt-0.5">{getStatusBadge(inv.status)}</div>
                      </div>

                      <Link
                        href={`/portal/invoices/${inv.id}`}
                        className="ml-3 px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-200 hover:bg-slate-50 transition"
                      >
                        {inv.status === "PAID" ? "View" : "Pay Now"}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent Payments</h3>
              </div>
              <Link
                href="/portal/payments"
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                View all ({data?.recentPayments?.length || 0})
              </Link>
            </div>

            {data?.recentPayments?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No payment transactions recorded.</p>
            ) : (
              <div className="space-y-3">
                {data?.recentPayments?.map((pay: any) => {
                  const amt = (Number(pay.amountMinor) / 100).toLocaleString("en-IN");
                  return (
                    <div
                      key={pay.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-slate-900">{pay.paymentReference}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {pay.paymentMethod} • {new Date(pay.paidAt).toLocaleDateString("en-IN")}
                        </div>
                      </div>

                      <div className="text-right font-mono font-bold text-emerald-600">
                        ₹{amt}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
