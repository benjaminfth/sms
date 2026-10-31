"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  ArrowLeft,
  Layers,
  Calendar,
  RefreshCw,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  XCircle,
  X,
  CreditCard,
} from "lucide-react";

export default function CustomerSubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function loadSubscription() {
      setLoading(true);
      try {
        const res = await api.get<any>(`/portal/subscriptions/${id}`);
        if (res.success && res.data) {
          setSubscription(res.data);
        } else {
          setError(res.error?.message || "Subscription not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load subscription");
      } finally {
        setLoading(false);
      }
    }
    if (id) loadSubscription();
  }, [id]);

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await api.post<any>(`/portal/subscriptions/${id}/cancel`, {
        reason: cancellationReason || "Customer requested cancellation via portal",
      });
      if (res.success && res.data) {
        setSubscription(res.data);
        setIsCancelModalOpen(false);
      } else {
        setError(res.error?.message || "Failed to cancel subscription");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during cancellation");
    } finally {
      setCancelling(false);
    }
  };

  const formatINR = (minor?: string | number | bigint) => {
    if (minor === undefined || minor === null) return "₹0.00";
    const val = typeof minor === "string" ? parseInt(minor, 10) : Number(minor);
    return (val / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-text-secondary">
        Loading subscription details...
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <AlertTriangle className="w-10 h-10 text-status-danger mx-auto mb-3" />
        <h2 className="text-[18px] font-semibold text-text-primary">Subscription not found</h2>
        <p className="text-[13px] text-text-secondary mt-1">{error || "The requested subscription does not exist."}</p>
        <Link
          href="/portal/subscriptions"
          className="mt-5 inline-flex items-center px-4 py-2 rounded-btn text-[13px] font-medium text-white bg-primary-accent hover:bg-primary-hover shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Subscriptions
        </Link>
      </div>
    );
  }

  const planPrice = subscription.plan?.prices?.[0]?.priceMinor;
  const interval = subscription.plan?.billingInterval || "MONTHLY";
  const canCancel = subscription.status === "ACTIVE" || subscription.status === "PAUSED";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <Link
          href="/portal/subscriptions"
          className="inline-flex items-center text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Subscriptions
        </Link>
        {canCancel && (
          <button
            onClick={() => setIsCancelModalOpen(true)}
            className="inline-flex items-center px-3 py-1.5 border border-status-danger/30 rounded-btn text-[12px] font-medium text-status-danger hover:bg-status-danger/10 transition-colors shadow-xs"
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Cancel Subscription
          </button>
        )}
      </div>

      {/* Main Subscription Card */}
      <div className="bg-surface-card rounded-card border border-border shadow-xs overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
          <div>
            <span className="text-[12px] font-mono font-medium text-text-muted block">
              {subscription.subscriptionNumber}
            </span>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mt-0.5">
              {subscription.plan?.name || "Enterprise Tier"}
            </h1>
            <p className="text-[13px] text-text-secondary mt-0.5">
              {subscription.plan?.description || "Dedicated enterprise subscription"}
            </p>
          </div>
          <div>
            <StatusBadge status={subscription.status} />
          </div>
        </div>

        {/* Pricing & Billing Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6 border-b border-border">
          <div className="p-4 bg-surface-canvas rounded-btn border border-border/60">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block">
              Recurring Tier Fee
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[22px] font-semibold text-text-primary font-mono tracking-tight">
                {formatINR(planPrice)}
              </span>
              <span className="text-[12px] text-text-secondary">/ {interval.toLowerCase()}</span>
            </div>
          </div>

          <div className="p-4 bg-surface-canvas rounded-btn border border-border/60">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block">
              Period Commenced
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <Calendar className="w-4 h-4 text-text-muted" />
              <span className="text-[13px] font-medium text-text-primary font-mono">
                {subscription.startDate
                  ? new Date(subscription.startDate).toLocaleDateString("en-IN")
                  : "N/A"}
              </span>
            </div>
          </div>

          <div className="p-4 bg-surface-canvas rounded-btn border border-border/60">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block">
              Next Scheduled Billing
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <RefreshCw className="w-4 h-4 text-primary-accent" />
              <span className="text-[13px] font-medium text-primary-accent font-mono">
                {subscription.nextBillingDate
                  ? new Date(subscription.nextBillingDate).toLocaleDateString("en-IN")
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Included Items */}
        <div className="py-6 border-b border-border">
          <h3 className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-3">
            Provisioned Services & Products
          </h3>
          <div className="space-y-2">
            {subscription.items && subscription.items.length > 0 ? (
              subscription.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-btn border border-border bg-surface-canvas"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-btn bg-primary-accent/10 text-primary-accent flex items-center justify-center font-bold text-[11px]">
                      {item.product?.name?.charAt(0) || "P"}
                    </div>
                    <div>
                      <h4 className="text-[13px] font-medium text-text-primary">
                        {item.product?.name || "Subscription Item"}
                      </h4>
                      <p className="text-[11px] text-text-muted">
                        {item.product?.sku ? `SKU: ${item.product.sku}` : "Catalog Product"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[12px] font-mono text-text-secondary">Qty: {item.quantity}</span>
                </div>
              ))
            ) : (
              <p className="text-[12px] text-text-muted">Standard plan entitlements provisioned.</p>
            )}
          </div>
        </div>

        {/* Associated Invoices */}
        <div className="pt-6">
          <h3 className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-3">
            Associated Invoices
          </h3>
          {subscription.invoices && subscription.invoices.length > 0 ? (
            <div className="divide-y divide-border border border-border rounded-btn overflow-hidden">
              {subscription.invoices.map((inv: any) => (
                <div
                  key={inv.id}
                  className="p-3.5 flex items-center justify-between hover:bg-surface-canvas transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="w-4 h-4 text-text-muted" />
                    <div>
                      <span className="text-[13px] font-mono font-medium text-text-primary block">
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-[11px] text-text-muted font-mono">
                        {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString("en-IN") : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[13px] font-mono font-medium text-text-primary block">
                        {formatINR(inv.totalAmountMinor)}
                      </span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <Link
                      href={`/portal/invoices/${inv.id}`}
                      className="p-1 rounded-btn text-text-muted hover:text-text-primary hover:bg-surface-canvas transition-colors"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-text-muted">No invoices generated yet.</p>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCancelModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
        >
          <div className="bg-surface-card rounded-dialog max-w-md w-full p-6 shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-semibold text-text-primary text-[15px]">Cancel Subscription</h3>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5">
              <p className="text-[12px] text-text-secondary leading-relaxed">
                Are you sure you want to cancel{" "}
                <span className="font-medium text-text-primary">{subscription.plan?.name}</span>? Access will remain active until the conclusion of your current billing period.
              </p>

              <div>
                <label className="text-[12px] font-medium text-text-primary block mb-1">
                  Cancellation Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please let us know how we can improve..."
                  className="w-full text-[13px] border border-border rounded-input p-2.5 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-3.5 py-1.5 text-[12px] font-medium text-text-secondary hover:text-text-primary"
                >
                  Keep Subscription
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleCancelSubscription}
                  className="px-3.5 py-1.5 text-[12px] font-medium rounded-btn text-white bg-status-danger hover:bg-status-danger/90 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
