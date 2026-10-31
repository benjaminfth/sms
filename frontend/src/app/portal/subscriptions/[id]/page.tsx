"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
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
        alert(res.error?.message || "Failed to cancel subscription");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred during cancellation");
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Active
          </span>
        );
      case "PAUSED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Paused
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Subscription not found</h2>
        <p className="text-gray-500 mt-1">{error || "The requested subscription does not exist."}</p>
        <Link
          href="/portal/subscriptions"
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
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
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Subscriptions
        </Link>
        {canCancel && (
          <button
            onClick={() => setIsCancelModalOpen(true)}
            className="inline-flex items-center px-3.5 py-1.5 border border-rose-200 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Cancel Subscription
          </button>
        )}
      </div>

      {/* Main Subscription Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-200 gap-4">
          <div>
            <span className="text-xs font-mono font-medium text-gray-400 block">
              {subscription.subscriptionNumber}
            </span>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              {subscription.plan?.name || "Cloud Subscription Plan"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {subscription.plan?.description || "High-performance enterprise subscription tier"}
            </p>
          </div>
          <div>{getStatusBadge(subscription.status)}</div>
        </div>

        {/* Pricing & Billing Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 border-b border-gray-200">
          <div className="p-4 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-500 block">Recurring Plan Fee</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-gray-900">{formatINR(planPrice)}</span>
              <span className="text-xs text-gray-500">/ {interval.toLowerCase()}</span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-500 block">Billing Period Started</span>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">
                {subscription.startDate
                  ? new Date(subscription.startDate).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-500 block">Next Renewal Date</span>
            <div className="flex items-center gap-2 mt-1">
              <RefreshCw className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {subscription.nextBillingDate
                  ? new Date(subscription.nextBillingDate).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Included Items */}
        <div className="py-6 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Included Services & Features
          </h3>
          <div className="space-y-3">
            {subscription.items && subscription.items.length > 0 ? (
              subscription.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {item.product?.name?.charAt(0) || "P"}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">
                        {item.product?.name || "Subscription Add-on"}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {item.product?.description || "Product module"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-600">Qty: {item.quantity}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">Standard plan features included.</p>
            )}
          </div>
        </div>

        {/* Associated Invoices */}
        <div className="pt-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Associated Invoices
          </h3>
          {subscription.invoices && subscription.invoices.length > 0 ? (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {subscription.invoices.map((inv: any) => (
                <div
                  key={inv.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="w-5 h-5 text-gray-400" />
                    <div>
                      <span className="text-sm font-semibold text-gray-900 block">
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-xs text-gray-500">
                        {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900 block">
                        {formatINR(inv.totalAmountMinor)}
                      </span>
                      <span className="text-xs text-gray-500">{inv.status}</span>
                    </div>
                    <Link
                      href={`/portal/invoices/${inv.id}`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No invoices generated yet.</p>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCancelModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Cancel Subscription</h3>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs text-gray-600">
                Are you sure you want to cancel{" "}
                <span className="font-semibold text-gray-900">{subscription.plan?.name}</span>? You
                will retain access until the end of your current billing period.
              </p>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please tell us why you are cancelling..."
                  className="w-full text-xs border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Keep Subscription
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleCancelSubscription}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
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
