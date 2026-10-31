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
import { SubscriptionStatus } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Play,
  Pause,
  XCircle,
  Building,
  Calendar,
  Receipt,
  FileText,
  Activity,
  Send,
  CheckCircle,
  RefreshCw,
  ShieldAlert,
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

  const handleAction = async (actionEndpoint: string, body?: any) => {
    try {
      await api.post(`/subscriptions/${id}/${actionEndpoint}`, body);
      fetchSubscription();
    } catch (err: any) {
      alert(err.message || `Failed to execute action ${actionEndpoint}`);
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

  const businessStatus = subscription.businessStatus || "ACTIVE";
  const policy = subscription.lifecyclePolicy || {};

  return (
    <DashboardShell>
      <PageHeader
        title={subscription.subscriptionNumber}
        description={`Provisioned on ${formatDate(subscription.createdAt)}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/subscriptions"
            className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Subscriptions
          </Link>

          {/* DRAFT -> Send Quotation */}
          {businessStatus === "DRAFT" && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Send Subscription Quotation",
                  description: "Send subscription offer to customer and transition to QUOTATION stage?",
                  action: () => handleAction("send-quotation"),
                })
              }
              className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Send Offer
            </button>
          )}

          {/* QUOTATION or DRAFT -> Confirm */}
          {(businessStatus === "QUOTATION" || businessStatus === "DRAFT") && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Confirm Accepted Terms",
                  description: "Confirm customer acceptance of commercial terms and transition to CONFIRMED stage?",
                  action: () => handleAction("confirm"),
                })
              }
              className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Confirm Terms
            </button>
          )}

          {/* CONFIRMED or DRAFT -> Activate */}
          {(businessStatus === "CONFIRMED" || businessStatus === "DRAFT") && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Activate Subscription",
                  description: "Activate subscription to start recurring billing cycles?",
                  action: () => handleAction("activate"),
                })
              }
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
            >
              <Play className="w-4 h-4 mr-1.5" />
              Activate
            </button>
          )}

          {/* ACTIVE -> Pause (if permitted by policy) */}
          {subscription.status === SubscriptionStatus.ACTIVE && policy.allowPause !== false && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Pause Subscription",
                  description: `Pause subscription ${subscription.subscriptionNumber}? No invoices will be generated while paused.`,
                  action: () => handleAction("pause"),
                })
              }
              className="inline-flex items-center px-3 py-2 border border-amber-300 rounded-lg text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100"
            >
              <Pause className="w-4 h-4 mr-1.5" />
              Pause
            </button>
          )}

          {/* PAUSED -> Resume */}
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
              className="inline-flex items-center px-3 py-2 border border-emerald-300 rounded-lg text-sm font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
            >
              <Play className="w-4 h-4 mr-1.5" />
              Resume
            </button>
          )}

          {/* ACTIVE -> Renew (if permitted) */}
          {subscription.status === SubscriptionStatus.ACTIVE && policy.allowRenewal !== false && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Renew Subscription",
                  description: `Renew subscription ${subscription.subscriptionNumber} for an additional 12 months?`,
                  action: () => handleAction("renew", { renewalDurationMonths: 12 }),
                })
              }
              className="inline-flex items-center px-3 py-2 border border-teal-300 rounded-lg text-sm font-medium text-teal-800 bg-teal-50 hover:bg-teal-100"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Renew Term
            </button>
          )}

          {/* Terminal Close */}
          {subscription.status !== SubscriptionStatus.CANCELLED && subscription.status !== SubscriptionStatus.EXPIRED && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Close Subscription",
                  description: `Close subscription ${subscription.subscriptionNumber}? This terminates the contract and ends future billing.`,
                  action: () => handleAction("close"),
                })
              }
              className="inline-flex items-center px-3 py-2 border border-rose-300 rounded-lg text-sm font-medium text-rose-800 bg-rose-50 hover:bg-rose-100"
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Close
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
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lifecycle Stage</span>
            <span className="text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {businessStatus}
            </span>
          </div>
          <p className="font-semibold text-slate-900 text-sm uppercase font-mono">
            {subscription.intervalCount > 1 ? `${subscription.intervalCount} ` : ""}{subscription.billingInterval}
          </p>
          <p className="text-xs text-slate-500">Raw DB Status: {subscription.status}</p>
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
          <div className="text-xs text-slate-500 pt-1">
            Payment Terms: <span className="font-semibold text-slate-700">{subscription.paymentTerms || "NET 15"}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Next Billing Date</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-lg font-bold text-slate-900 font-mono">
            {subscription.status === SubscriptionStatus.PAUSED
              ? "PAUSED"
              : subscription.status === SubscriptionStatus.CANCELLED || subscription.status === SubscriptionStatus.EXPIRED
              ? "CLOSED"
              : formatDate(subscription.nextBillingDate)}
          </p>
          <div className="text-[11px] text-slate-500 space-x-1">
            <span>Pause: {policy.allowPause !== false ? "Allowed" : "No"}</span>
            <span>•</span>
            <span>Renewal: {policy.allowRenewal !== false ? "Allowed" : "No"}</span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-900">Subscription Products & Services</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">{subscription.items?.length || 0} line items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3 text-right">Quantity</th>
                <th className="px-6 py-3 text-right">Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscription.items?.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {item.product?.name}
                    {item.productVariant && (
                      <span className="text-xs text-slate-500 block">
                        Variant: {item.productVariant.name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {item.productVariant?.sku || item.product?.sku || "-"}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs">
                    {parseFloat(item.quantity).toFixed(3)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs font-semibold">
                    <MoneyDisplay
                      amountMinor={item.unitPriceMinor}
                      currency={subscription.currency}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Associated Invoices */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-900">Billing History & Invoices</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {subscription.invoices?.length || 0} issued
          </span>
        </div>

        {subscription.invoices && subscription.invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Invoice Number</th>
                  <th className="px-6 py-3">Issued Date</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3 text-right">Total Amount</th>
                  <th className="px-6 py-3 text-right">Balance Due</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscription.invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-brand-600">
                      <Link href={`/admin/invoices/${inv.id}`}>{inv.invoiceNumber}</Link>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">
                      {formatDate(inv.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs font-semibold">
                      <MoneyDisplay amountMinor={inv.totalAmountMinor} currency={inv.currency} />
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs font-semibold text-rose-600">
                      <MoneyDisplay amountMinor={inv.balanceDueMinor} currency={inv.currency} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/invoices/${inv.id}`}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            No invoices generated yet. The recurring billing engine will generate invoices on the next billing date.
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={async () => {
          await confirmDialog.action();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </DashboardShell>
  );
}
