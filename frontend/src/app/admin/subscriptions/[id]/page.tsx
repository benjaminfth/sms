"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { api } from "@/lib/api-client";
import { SubscriptionWithDetailsDTO, SubscriptionStatus } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Play,
  Pause,
  XCircle,
  Building,
  Mail,
  Calendar,
  Receipt,
  FileText,
  Activity,
} from "lucide-react";

export default function SubscriptionDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [subscription, setSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    action: async () => {},
  });

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/subscriptions/${id}`);
      if (res.success && res.data) {
        setSubscription(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load subscription");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleAction = async (actionType: "activate" | "pause" | "resume" | "cancel") => {
    try {
      await api.post(`/subscriptions/${id}/${actionType}`);
      fetchSubscription();
    } catch (err: any) {
      alert(err.message || `Failed to ${actionType} subscription`);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-20 text-center text-slate-400">Loading subscription details...</div>
      </DashboardShell>
    );
  }

  if (error || !subscription) {
    return (
      <DashboardShell>
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl">
          {error || "Subscription not found"}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title={subscription.subscriptionNumber}
        description={`Provisioned on ${formatDate(subscription.createdAt)}`}
      >
        <div className="flex items-center space-x-2">
            <Link
              href="/admin/subscriptions"
              className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 mr-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              All Subscriptions
            </Link>

            {subscription.status === SubscriptionStatus.ACTIVE && (
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: "Pause Subscription",
                    description: `Pause subscription ${subscription.subscriptionNumber}? No invoices will be generated while paused.`,
                    action: () => handleAction("pause"),
                  })
                }
                className="inline-flex items-center px-3.5 py-2 border border-amber-300 rounded-lg text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 shadow-sm"
              >
                <Pause className="w-4 h-4 mr-1.5" />
                Pause Subscription
              </button>
            )}

            {subscription.status === SubscriptionStatus.PAUSED && (
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: "Resume Subscription",
                    description: `Resume subscription ${subscription.subscriptionNumber}? Billing cycle will resume.`,
                    action: () => handleAction("resume"),
                  })
                }
                className="inline-flex items-center px-3.5 py-2 border border-emerald-300 rounded-lg text-sm font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 shadow-sm"
              >
                <Play className="w-4 h-4 mr-1.5" />
                Resume Subscription
              </button>
            )}

            {subscription.status !== SubscriptionStatus.CANCELLED && (
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: "Cancel Subscription",
                    description: `Cancel subscription ${subscription.subscriptionNumber}? It will not generate any recurring invoices in future cycles.`,
                    action: () => handleAction("cancel"),
                  })
                }
                className="inline-flex items-center px-3.5 py-2 border border-rose-300 rounded-lg text-sm font-medium text-rose-800 bg-rose-50 hover:bg-rose-100 shadow-sm"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Cancel Subscription
              </button>
            )}
          </div>
      </PageHeader>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-900 text-sm">{subscription.customer?.fullName}</p>
          <p className="text-xs text-slate-500">{subscription.customer?.companyName || "Individual"}</p>
          <p className="text-xs text-slate-400">{subscription.customer?.email}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status & Interval</span>
            <StatusBadge status={subscription.status} />
          </div>
          <p className="font-semibold text-slate-900 text-sm uppercase font-mono">
            {subscription.intervalCount > 1 ? `${subscription.intervalCount} ` : ""}{subscription.billingInterval}
          </p>
          <p className="text-xs text-slate-500">Currency: {subscription.currency}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Period</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xs font-mono text-slate-700 space-y-0.5">
            <div>From: {formatDate(subscription.currentPeriodStart)}</div>
            <div>To: {formatDate(subscription.currentPeriodEnd)}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Next Billing Date</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-lg font-bold text-slate-900 font-mono">
            {formatDate(subscription.nextBillingDate)}
          </p>
          {subscription.cancelledAt && (
            <p className="text-xs text-rose-600">
              Cancelled: {formatDate(subscription.cancelledAt)}
            </p>
          )}
        </div>
      </div>

      {/* Subscription Line Items */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-800">Subscribed Items & Pricing</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
              <th className="py-3 px-4">Product / Item</th>
              <th className="py-3 px-4 text-right">Quantity</th>
              <th className="py-3 px-4 text-right">Unit Price</th>
              <th className="py-3 px-4 text-right">Recurring Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {subscription.items.map((it: any) => {
              const qty = parseFloat(it.quantity) || 1.0;
              const unit = BigInt(it.unitPriceMinor || "0");
              const lineTotal = (unit * BigInt(Math.round(qty * 1000))) / BigInt(1000);

              return (
                <tr key={it.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-900">{it.product?.name}</p>
                    {it.productVariant && (
                      <span className="text-xs text-slate-500">
                        Variant: {it.productVariant.name}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                    {qty.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                    <MoneyDisplay amountMinor={it.unitPriceMinor} currency={subscription.currency} />
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                    <MoneyDisplay amountMinor={lineTotal.toString()} currency={subscription.currency} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Associated Invoices */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-800">Generated Billing Invoices</h3>
          </div>
          <span className="text-xs text-slate-500">
            {subscription.invoices?.length || 0} invoice(s)
          </span>
        </div>

        {subscription.invoices && subscription.invoices.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Billing Period</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {subscription.invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-semibold text-brand-600 font-mono">
                    <Link href={`/admin/invoices/${inv.id}`}>{inv.invoiceNumber}</Link>
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-slate-600">
                    {inv.billingPeriodStart ? formatDate(inv.billingPeriodStart) : "—"} →{" "}
                    {inv.billingPeriodEnd ? formatDate(inv.billingPeriodEnd) : "—"}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-slate-600">
                    {formatDate(inv.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">
                    <MoneyDisplay amountMinor={inv.totalAmountMinor} currency={inv.currency} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    <MoneyDisplay amountMinor={inv.balanceDueMinor} currency={inv.currency} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      className="text-xs font-medium text-slate-600 hover:text-brand-600 underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No invoices generated yet. Invoices will be created automatically when billing is executed.
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </DashboardShell>
  );
}
