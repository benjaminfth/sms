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

  // Confirm dialog state
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
      setError(err.message || `Failed to execute action ${actionEndpoint}`);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-20 text-center text-[#64748B] text-[13px]">
          Loading commercial subscription details...
        </div>
      </DashboardShell>
    );
  }

  if (error || !subscription) {
    return (
      <DashboardShell>
        <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] p-6 rounded-[10px] text-[13px]">
          {error || "Subscription not found"}
        </div>
      </DashboardShell>
    );
  }

  const businessStatus = subscription.businessStatus || "ACTIVE";
  const policy = subscription.lifecyclePolicy || {};

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
        badge={<StatusBadge status={businessStatus || subscription.status} />}
      >
        <div className="flex flex-wrap items-center gap-2">
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
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#315CF5] bg-[#315CF5]/10 hover:bg-[#315CF5]/20 border border-[#315CF5]/30 transition"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
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
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] transition"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
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
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-white bg-[#10B981] hover:bg-[#059669] shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Activate
            </button>
          )}

          {/* Pause Action */}
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
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#C58A24] bg-[#FDF8ED] hover:bg-[#F6E2B8] border border-[#F6E2B8] transition"
            >
              <Pause className="w-3.5 h-3.5 mr-1.5" />
              Pause Contract
            </button>
          )}

          {/* Resume Action */}
          {subscription.status === SubscriptionStatus.PAUSED && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Resume Subscription",
                  description: `Resume billing cycles for subscription ${subscription.subscriptionNumber}?`,
                  action: () => handleAction("resume"),
                })
              }
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-white bg-[#10B981] hover:bg-[#059669] shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Resume Contract
            </button>
          )}

          {/* Contractual Renewal */}
          {businessStatus !== "CLOSED" && policy.allowRenewal !== false && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Renew Contract Term",
                  description: "Contractually extend this subscription by 12 months?",
                  action: () => handleAction("renew", { renewalDurationMonths: 12 }),
                })
              }
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#315CF5] bg-[#315CF5]/10 hover:bg-[#315CF5]/20 border border-[#315CF5]/30 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Renew 12 Mo
            </button>
          )}

          {/* Terminal Close Contract */}
          {businessStatus !== "CLOSED" && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Close Subscription",
                  description: "Transition subscription to terminal CLOSED state? No further billing or renewals can occur.",
                  action: () => handleAction("close", { reason: "Closed by admin" }),
                })
              }
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#E11D48] bg-[#FFF1F2] hover:bg-[#FFE4E6] border border-[#FECDD3] transition"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Close Contract
            </button>
          )}

          {/* Early Cancellation */}
          {subscription.status === SubscriptionStatus.ACTIVE && policy.allowEarlyClosure !== false && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Cancel Subscription",
                  description: `Cancel subscription ${subscription.subscriptionNumber}? Immediate termination of contract.`,
                  action: () => handleAction("cancel"),
                })
              }
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#E11D48] bg-[#FFF1F2] hover:bg-[#FFE4E6] border border-[#FECDD3] transition"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Cancel Contract
            </button>
          )}
        </div>
      </PageHeader>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF1]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">Customer</span>
            <Building className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="mt-2.5">
            <p className="text-[14px] font-semibold text-[#172033]">{subscription.customer?.fullName}</p>
            <p className="text-[12px] text-[#64748B] mt-0.5">{subscription.customer?.companyName || "Individual Account"}</p>
            <p className="text-[12px] font-mono text-[#64748B] mt-1">{subscription.customer?.email}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF1]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">Contract Details</span>
            <Activity className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="mt-2.5 space-y-1 text-[12px] text-[#64748B]">
            <div>Interval: <span className="font-mono text-[#172033] font-medium uppercase">{subscription.billingInterval}</span></div>
            <div>Stage: <span className="font-mono text-[#172033] font-medium">{businessStatus}</span></div>
            <div>Terms: <span className="font-mono text-[#172033] font-medium">{subscription.paymentTerms || "NET_15"}</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF1]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">Billing Schedule</span>
            <Calendar className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="mt-2.5 space-y-1 text-[12px] text-[#64748B]">
            <div>Next Billing: <span className="font-mono text-[#315CF5] font-semibold">{formatDate(subscription.nextBillingDate)}</span></div>
            <div>Period Start: <span className="font-mono text-[#172033]">{formatDate(subscription.currentPeriodStart)}</span></div>
            <div>Period End: <span className="font-mono text-[#172033]">{formatDate(subscription.currentPeriodEnd)}</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF1]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">Plan Policy</span>
            <ShieldAlert className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="mt-2.5 space-y-1 text-[11px] text-[#64748B]">
            <div>Pause Allowed: <span className="font-mono text-[#172033]">{policy.allowPause !== false ? "Yes" : "No"}</span></div>
            <div>Early Close Allowed: <span className="font-mono text-[#172033]">{policy.allowEarlyClosure !== false ? "Yes" : "No"}</span></div>
            <div>Renewal Allowed: <span className="font-mono text-[#172033]">{policy.allowRenewal !== false ? "Yes" : "No"}</span></div>
          </div>
        </div>
      </div>

      {/* Subscription Line Items */}
      <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden mb-6">
        <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[#172033]">Subscription Items</h2>
            <p className="text-[12px] text-[#64748B] mt-0.5">{subscription.items?.length || 0} product line(s) provisioned</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                <th className="py-2.5 px-4">Product / Item</th>
                <th className="py-2.5 px-4">Variant</th>
                <th className="py-2.5 px-4 text-right">Quantity</th>
                <th className="py-2.5 px-4 text-right">Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1]">
              {subscription.items?.map((it: any) => (
                <tr key={it.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4 font-medium text-[#172033]">{it.product?.name || "Product"}</td>
                  <td className="py-3 px-4 text-[12px] text-[#64748B]">{it.productVariant?.name || "Base"}</td>
                  <td className="py-3 px-4 text-right font-mono text-[#64748B]">
                    {parseFloat(it.quantity).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-[#172033]">
                    <MoneyDisplay amountMinor={it.unitPriceMinor} currency={subscription.currency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices History Table */}
      {subscription.invoices && subscription.invoices.length > 0 && (
        <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden mb-6">
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
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </DashboardShell>
  );
}
