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
import { SubscriptionWithDetailsDTO, SubscriptionStatus, formatMinorToCurrency } from "@sms/shared";
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
  CheckCircle2,
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
      setError(err.message || `Failed to ${actionType} subscription`);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-20 text-center text-[#94A3B8]">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#315CF5] border-t-transparent" />
          <p className="mt-2 text-[12px]">Loading subscription telemetry...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !subscription) {
    return (
      <DashboardShell>
        <div className="bg-[#FDEDED] border border-[#F8C6C6] text-[#D14343] p-6 rounded-[10px] text-[13px]">
          {error || "Subscription not found"}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-4">
        <Link
          href="/admin/subscriptions"
          className="inline-flex items-center text-[12px] font-medium text-[#64748B] hover:text-[#172033] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Subscriptions
        </Link>
      </div>

      <PageHeader
        title={subscription.subscriptionNumber}
        description={`Contract provisioned on ${formatDate(subscription.createdAt)}`}
        badge={<StatusBadge status={subscription.status} />}
      >
        <div className="flex items-center space-x-2">
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
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#C58A24] bg-[#FDF8ED] hover:bg-[#F6E2B8] border border-[#F6E2B8] transition"
            >
              <Pause className="w-3.5 h-3.5 mr-1.5" />
              Pause Contract
            </button>
          )}

          {subscription.status === SubscriptionStatus.PAUSED && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Resume Subscription",
                  description: `Resume subscription ${subscription.subscriptionNumber}? Recurring billing schedule will activate.`,
                  action: () => handleAction("resume"),
                })
              }
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-white bg-[#16865B] hover:bg-[#126b48] shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Resume Contract
            </button>
          )}

          {subscription.status !== SubscriptionStatus.CANCELLED && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Cancel Subscription",
                  description: `Cancel subscription ${subscription.subscriptionNumber}? It will not generate future invoices.`,
                  action: () => handleAction("cancel"),
                })
              }
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#D14343] bg-white border border-[#F8C6C6] hover:bg-[#FDEDED] transition"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Cancel Contract
            </button>
          )}
        </div>
      </PageHeader>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1">
            <span>Customer</span>
            <Building className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="font-semibold text-[#172033] text-[14px] truncate">
            {subscription.customer?.fullName}
          </p>
          <p className="text-[12px] text-[#64748B] truncate mt-0.5">
            {subscription.customer?.companyName || "Individual Account"}
          </p>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1">
            <span>Billing Interval</span>
            <Activity className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="font-semibold text-[#172033] text-[14px] font-mono uppercase">
            {subscription.intervalCount > 1 ? `${subscription.intervalCount} ` : ""}{subscription.billingInterval}
          </p>
          <p className="text-[12px] text-[#64748B] mt-0.5">Currency: {subscription.currency}</p>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1">
            <span>Current Period</span>
            <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="font-mono text-[12px] text-[#172033]">
            {formatDate(subscription.currentPeriodStart)} → {formatDate(subscription.currentPeriodEnd)}
          </p>
          <p className="text-[11px] text-[#16865B] font-medium mt-1">In Cycle</p>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1">
            <span>Next Billing Run</span>
            <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="font-semibold text-[#172033] text-[14px] font-mono">
            {formatDate(subscription.nextBillingDate)}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">Automated invoice trigger</p>
        </div>
      </div>

      {/* Subscription Items Table */}
      <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden mb-6">
        <div className="p-4 border-b border-[#E5EAF1]">
          <h2 className="text-[14px] font-semibold text-[#172033]">Provisioned Services & Add-ons</h2>
          <p className="text-[12px] text-[#64748B] mt-0.5">Components billed in this subscription contract</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                <th className="py-2.5 px-4">Item Name</th>
                <th className="py-2.5 px-4">SKU / Variant</th>
                <th className="py-2.5 px-4 text-right">Quantity</th>
                <th className="py-2.5 px-4 text-right">Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1]">
              {subscription.items.map((it: any) => (
                <tr key={it.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4 font-medium text-[#172033]">
                    {it.product?.name || "Service Line"}
                  </td>
                  <td className="py-3 px-4 text-[12px] font-mono text-[#64748B]">
                    {it.product?.sku} {it.productVariant ? `(${it.productVariant.name})` : ""}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#64748B]">
                    {parseFloat(it.quantity).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-[#172033]">
                    {formatMinorToCurrency(it.unitPriceMinor, subscription.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices History Table */}
      {subscription.invoices && subscription.invoices.length > 0 && (
        <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5EAF1]">
            <h2 className="text-[14px] font-semibold text-[#172033]">Associated Invoices</h2>
            <p className="text-[12px] text-[#64748B] mt-0.5">Billing cycle invoices generated under this contract</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4 text-right">Balance Due</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {subscription.invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-4 font-mono font-medium">
                      <Link
                        href={`/admin/invoices/${inv.id}`}
                        className="text-[#315CF5] hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#64748B]">{formatDate(inv.dueDate)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#172033]">
                      <MoneyDisplay amountMinor={inv.totalAmountMinor} currency={inv.currency} />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#C58A24]">
                      <MoneyDisplay amountMinor={inv.balanceDueMinor} currency={inv.currency} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={async () => {
          await confirmDialog.action();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </DashboardShell>
  );
}
