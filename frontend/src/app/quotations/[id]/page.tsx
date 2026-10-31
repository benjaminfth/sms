"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, formatMinor } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Repeat,
  Printer,
  Calendar,
  Building2,
  FileText,
  Clock,
  Layers,
} from "lucide-react";

export default function QuotationDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Conversion Modal State
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [billingInterval, setBillingInterval] = useState("MONTHLY");

  const fetchQuotation = async () => {
    try {
      const data = await api.get<any>(`/quotations/${id}`);
      setQuotation(data);
    } catch (err: any) {
      setError(err.message || "Failed to load quotation details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const handleSend = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/quotations/${id}/send`);
      setSuccessMessage("Quotation sent successfully to customer.");
      fetchQuotation();
    } catch (err: any) {
      setError(err.message || "Failed to send quotation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/quotations/${id}/accept`);
      setSuccessMessage("Quotation accepted!");
      fetchQuotation();
    } catch (err: any) {
      setError(err.message || "Failed to accept quotation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt("Enter rejection reason (optional):");
    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/quotations/${id}/reject`, { reason });
      setSuccessMessage("Quotation marked as rejected.");
      fetchQuotation();
    } catch (err: any) {
      setError(err.message || "Failed to reject quotation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvert = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const subscription = await api.post<any>(`/quotations/${id}/convert`, {
        billingInterval,
        intervalCount: 1,
      });
      setShowConvertModal(false);
      setSuccessMessage("Quotation successfully converted to Active Subscription!");
      router.push(`/subscriptions/${subscription.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to convert quotation to subscription");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
        <p className="text-sm">Loading quotation...</p>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-12 text-center">
        <p className="text-rose-600">{error || "Quotation not found"}</p>
        <Link href="/quotations" className="text-sm text-indigo-600 hover:underline mt-2 inline-block">
          Return to quotations
        </Link>
      </div>
    );
  }

  const isConverted = Boolean(quotation.subscription);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/quotations"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {quotation.quotationNumber}
              </h1>
              {isConverted ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 flex items-center">
                  <Layers className="w-3 h-3 mr-1" />
                  CONVERTED
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                  {quotation.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Created on {new Date(quotation.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {quotation.status === "DRAFT" && user?.role !== "CUSTOMER" && (
            <button
              onClick={handleSend}
              disabled={actionLoading}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm"
            >
              <Send className="w-4 h-4 mr-2" />
              Send to Customer
            </button>
          )}

          {quotation.status === "SENT" && (
            <>
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow-sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept Quotation
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="inline-flex items-center px-3.5 py-2 border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 text-sm font-medium rounded-lg"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </button>
            </>
          )}

          {quotation.status === "ACCEPTED" && !isConverted && user?.role !== "CUSTOMER" && (
            <button
              onClick={() => setShowConvertModal(true)}
              disabled={actionLoading}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm"
            >
              <Repeat className="w-4 h-4 mr-2" />
              Convert to Subscription
            </button>
          )}

          {isConverted && (
            <Link
              href={`/subscriptions/${quotation.subscription?.id}`}
              className="inline-flex items-center px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 text-sm font-medium rounded-lg hover:bg-purple-100"
            >
              <Repeat className="w-4 h-4 mr-2" />
              View Subscription ({quotation.subscription?.subscriptionNumber})
            </Link>
          )}

          <button
            onClick={() => window.print()}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100"
            title="Print Quotation"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm">
          {successMessage}
        </div>
      )}

      {/* Main Quotation Sheet */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
        {/* Brand & Customer Overview */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-6">
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl mb-2">
              BL
            </div>
            <h2 className="text-xl font-bold text-slate-900">Brightloop Software Pvt Ltd</h2>
            <p className="text-xs text-slate-500">Cloud Subscription & Billing Automation Suite</p>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Quotation Reference
            </span>
            <span className="text-lg font-mono font-bold text-slate-900">
              {quotation.quotationNumber}
            </span>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-end">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Valid Until: {new Date(quotation.validUntil).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Prepared For
            </span>
            <h3 className="text-base font-semibold text-slate-900 mt-1">
              {quotation.customer?.fullName}
            </h3>
            {quotation.customer?.companyName && (
              <p className="text-xs text-slate-600 flex items-center mt-0.5">
                <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {quotation.customer.companyName}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">{quotation.customer?.email}</p>
          </div>

          <div className="sm:text-right">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Billing Terms
            </span>
            <p className="text-xs text-slate-700 mt-1">Currency: {quotation.currency}</p>
            <p className="text-xs text-slate-500">
              Pricing snapshot locked upon customer acceptance
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Scope & Commercial Items
          </h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Item Description</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotation.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.description}</div>
                      {item.product?.sku && (
                        <div className="text-xs text-slate-400 font-mono">SKU: {item.product.sku}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono">
                      {parseFloat(item.quantity).toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono">
                      {formatMinor(item.unitPriceMinor, quotation.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 font-mono">
                      {formatMinor(item.totalAmountMinor, quotation.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="border-t border-slate-100 pt-4 flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Agreed Total:</span>
              <span className="font-bold text-lg text-indigo-600 font-mono">
                {formatMinor(quotation.totalAmountMinor, quotation.currency)}
              </span>
            </div>
            <p className="text-xs text-slate-400 text-right">
              Taxes calculated and applied at recurring invoice generation
            </p>
          </div>
        </div>

        {/* Notes & Terms */}
        {quotation.notes && (
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Commercial Terms & Notes
            </h4>
            <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-600 whitespace-pre-line border border-slate-100">
              {quotation.notes}
            </div>
          </div>
        )}
      </div>

      {/* Convert to Subscription Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <Repeat className="w-5 h-5 mr-2 text-indigo-600" />
              Convert to Active Subscription
            </h3>
            <p className="text-sm text-slate-500">
              This will create a recurring subscription linked to this quotation, preserving agreed items and locked pricing.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Recurring Billing Interval
              </label>
              <select
                value={billingInterval}
                onChange={(e) => setBillingInterval(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
                <option value="WEEKLY">Weekly</option>
                <option value="DAILY">Daily</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvert}
                disabled={actionLoading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm"
              >
                {actionLoading ? "Converting..." : "Confirm Conversion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

