"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api, formatMinor } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  ArrowLeft,
  Pause,
  Play,
  XOctagon,
  Calendar,
  Building2,
  Receipt,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function SubscriptionDetailsPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Cancellation Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const fetchSubscription = async () => {
    try {
      const data = await api.get<any>(`/subscriptions/${id}`);
      setSubscription(data);
    } catch (err: any) {
      setError(err.message || "Failed to load subscription");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [id]);

  const handleAction = async (action: "pause" | "resume" | "activate") => {
    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      await api.post(`/subscriptions/${id}/${action}`);
      setMessage(`Subscription ${action}d successfully.`);
      fetchSubscription();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} subscription`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert("Please provide a cancellation reason");
      return;
    }
    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      await api.post(`/subscriptions/${id}/cancel`, {
        reason: cancelReason,
        immediate: true,
      });
      setShowCancelModal(false);
      setMessage("Subscription cancelled successfully.");
      fetchSubscription();
    } catch (err: any) {
      setError(err.message || "Failed to cancel subscription");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
        <p className="text-sm">Loading subscription...</p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-12 text-center text-rose-600">
        <p>{error || "Subscription not found"}</p>
        <Link href="/subscriptions" className="text-sm text-indigo-600 hover:underline mt-2 inline-block">
          Return to subscriptions
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/subscriptions"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {subscription.subscriptionNumber}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  subscription.status === "ACTIVE"
                    ? "bg-green-100 text-green-800"
                    : subscription.status === "PAUSED"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {subscription.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Active since {new Date(subscription.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Lifecycle Actions */}
        <div className="flex items-center space-x-2">
          {subscription.status === "ACTIVE" && user?.role !== "CUSTOMER" && (
            <button
              onClick={() => handleAction("pause")}
              disabled={actionLoading}
              className="inline-flex items-center px-3.5 py-2 border border-slate-200 bg-white hover:bg-amber-50 text-amber-700 text-sm font-medium rounded-lg shadow-sm"
            >
              <Pause className="w-4 h-4 mr-1.5" />
              Pause
            </button>
          )}

          {subscription.status === "PAUSED" && user?.role !== "CUSTOMER" && (
            <button
              onClick={() => handleAction("resume")}
              disabled={actionLoading}
              className="inline-flex items-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm"
            >
              <Play className="w-4 h-4 mr-1.5" />
              Resume
            </button>
          )}

          {subscription.status !== "CANCELLED" && (
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={actionLoading}
              className="inline-flex items-center px-3.5 py-2 border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 text-sm font-medium rounded-lg"
            >
              <XOctagon className="w-4 h-4 mr-1.5" />
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm">
          {message}
        </div>
      )}

      {/* Subscription Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Billing Frequency
          </span>
          <div className="text-lg font-bold text-slate-900 uppercase">
            {subscription.billingInterval} ({subscription.intervalCount}x)
          </div>
          <p className="text-xs text-slate-500">Scheduled automated period renewal</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Current Billing Period
          </span>
          <div className="text-sm font-semibold text-slate-900">
            {new Date(subscription.currentPeriodStart).toLocaleDateString()} –{" "}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </div>
          <p className="text-xs text-slate-500">Start-inclusive, end-exclusive</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Next Invoice Date
          </span>
          <div className="text-lg font-bold text-indigo-600 flex items-center font-mono">
            <Calendar className="w-4 h-4 mr-1.5 text-indigo-500" />
            {new Date(subscription.nextBillingDate).toLocaleDateString()}
          </div>
          <p className="text-xs text-slate-500">Processed by recurring billing engine</p>
        </div>
      </div>

      {/* Subscription Customer & Source */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Commercial Context</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold block">Customer</span>
            <div className="font-semibold text-slate-900 mt-1">{subscription.customer?.fullName}</div>
            {subscription.customer?.companyName && (
              <div className="text-xs text-slate-500 flex items-center mt-0.5">
                <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {subscription.customer.companyName}
              </div>
            )}
            <div className="text-xs text-slate-500">{subscription.customer?.email}</div>
          </div>

          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold block">Origin / Source</span>
            {subscription.quotation ? (
              <div className="mt-1">
                <Link
                  href={`/quotations/${subscription.quotation.id}`}
                  className="font-mono text-indigo-600 hover:underline font-medium"
                >
                  Converted from {subscription.quotation.quotationNumber}
                </Link>
                <p className="text-xs text-slate-400 mt-0.5">Commercial proposal locked terms</p>
              </div>
            ) : subscription.plan ? (
              <div className="mt-1">
                <span className="font-medium text-slate-900">{subscription.plan.name}</span>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Plan: {subscription.plan.code}</p>
              </div>
            ) : (
              <div className="text-slate-500 mt-1">Directly provisioned custom agreement</div>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Line Items */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Subscription Products & Services</h3>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">Product / Service</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscription.items?.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{item.product?.name}</div>
                    {item.productVariant && (
                      <div className="text-xs text-slate-500">Variant: {item.productVariant.name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">
                    {parseFloat(item.quantity).toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 font-mono">
                    {formatMinor(item.unitPriceMinor, subscription.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold text-slate-900 flex items-center">
            <Receipt className="w-4 h-4 mr-2 text-indigo-600" />
            Generated Invoices
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {subscription.invoices?.length || 0} invoice(s) issued
          </span>
        </div>

        {subscription.invoices?.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No invoices have been generated yet. Next billing cycle will issue an invoice automatically.
          </p>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 font-semibold text-slate-700 text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-left">Invoice Number</th>
                  <th className="px-4 py-2.5 text-left">Billing Period</th>
                  <th className="px-4 py-2.5 text-right">Total Amount</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {subscription.invoices?.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-medium text-indigo-600">
                      <Link href={`/invoices/${inv.id}`}>{inv.invoiceNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {inv.billingPeriodStart ? new Date(inv.billingPeriodStart).toLocaleDateString() : "—"} –{" "}
                      {inv.billingPeriodEnd ? new Date(inv.billingPeriodEnd).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold font-mono text-slate-900">
                      {formatMinor(inv.totalAmountMinor, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/invoices/${inv.id}`} className="text-indigo-600 font-semibold hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-900">Cancel Subscription</h3>
            </div>
            <p className="text-sm text-slate-500">
              Cancelling will stop future recurring billing invoices. Once cancelled, a subscription cannot be silently reactivated.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Cancellation Reason *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Reason for contract termination..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg"
              >
                {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

