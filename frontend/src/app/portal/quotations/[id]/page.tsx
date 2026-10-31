"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  ArrowLeft,
  FileText,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function CustomerQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    async function loadQuotation() {
      setLoading(true);
      try {
        const res = await api.get<any>(`/portal/quotations/${id}`);
        if (res.success && res.data) {
          setQuotation(res.data);
        } else {
          setError(res.error?.message || "Quotation not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load quotation");
      } finally {
        setLoading(false);
      }
    }
    if (id) loadQuotation();
  }, [id]);

  const handleRespond = async (action: "ACCEPT" | "REJECT") => {
    if (
      !confirm(
        action === "ACCEPT"
          ? "Are you sure you want to ACCEPT this quotation? An official subscription will be prepared."
          : "Are you sure you want to REJECT this quotation?"
      )
    ) {
      return;
    }

    setResponding(true);
    try {
      const endpoint =
        action === "ACCEPT"
          ? `/portal/quotations/${id}/accept`
          : `/portal/quotations/${id}/reject`;

      const res = await api.post<any>(endpoint, {});
      if (res.success && res.data) {
        setQuotation(res.data);
      } else {
        alert(res.error?.message || `Failed to ${action.toLowerCase()} quotation`);
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setResponding(false);
    }
  };

  const formatINR = (minor?: string | number | bigint) => {
    if (minor === undefined || minor === null) return "₹0.00";
    const val = typeof minor === "string" ? parseInt(minor, 10) : Number(minor);
    return (val / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Accepted & Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Declined
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            Expired
          </span>
        );
      case "SENT":
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Awaiting Your Decision
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

  if (error || !quotation) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Quotation not found</h2>
        <p className="text-gray-500 mt-1">{error || "The requested quotation does not exist."}</p>
        <Link
          href="/portal/quotations"
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quotations
        </Link>
      </div>
    );
  }

  const isPending = quotation.status === "SENT" || quotation.status === "DRAFT";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <Link
          href="/portal/quotations"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Quotations
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print / PDF
          </button>
          {isPending && (
            <div className="flex items-center gap-2">
              <button
                disabled={responding}
                onClick={() => handleRespond("REJECT")}
                className="inline-flex items-center px-4 py-2 border border-rose-200 rounded-lg text-sm font-medium text-rose-600 bg-white hover:bg-rose-50 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Decline
              </button>
              <button
                disabled={responding}
                onClick={() => handleRespond("ACCEPT")}
                className="inline-flex items-center px-5 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Accept Proposal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Printable Quotation Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8 sm:p-12 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row justify-between items-start pb-8 border-b border-gray-200 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg">
                B
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                Brightloop Software
              </span>
            </div>
            <p className="text-xs text-gray-500">Commercial Service & Subscription Proposal</p>
            <p className="text-xs text-gray-500 mt-1">GSTIN: 29AABCU9603R1ZM</p>
          </div>

          <div className="text-left sm:text-right">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">OFFICIAL QUOTATION</h1>
            <p className="text-sm font-semibold text-primary mt-1">{quotation.quotationNumber}</p>
            <div className="mt-2">{getStatusBadge(quotation.status)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-gray-200 text-sm">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              Prepared For
            </span>
            <p className="font-bold text-gray-900 text-base">{quotation.customer?.fullName || "Valued Client"}</p>
            {quotation.customer?.companyName && (
              <p className="text-gray-600 font-medium">{quotation.customer.companyName}</p>
            )}
            <p className="text-gray-500 mt-1">{quotation.customer?.email}</p>
          </div>

          <div className="sm:text-right space-y-2">
            <div>
              <span className="text-xs text-gray-500">Quotation Date:</span>
              <span className="ml-2 font-medium text-gray-900">
                {quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString() : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500">Valid Until:</span>
              <span className="ml-2 font-semibold text-rose-600">
                {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : "30 Days"}
              </span>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="py-8 border-b border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 tracking-wider">
                <th className="py-3 px-2">Description</th>
                <th className="py-3 px-2 text-center">Qty</th>
                <th className="py-3 px-2 text-right">Unit Price</th>
                <th className="py-3 px-2 text-right">Tax Rate</th>
                <th className="py-3 px-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {quotation.items && quotation.items.length > 0 ? (
                quotation.items.map((item: any, idx: number) => (
                  <tr key={item.id || idx}>
                    <td className="py-4 px-2">
                      <div className="font-semibold text-gray-900">
                        {item.description || item.product?.name || "Service Module"}
                      </div>
                      {item.product?.code && (
                        <span className="text-xs text-gray-400">Code: {item.product.code}</span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-4 px-2 text-right text-gray-600">
                      {formatINR(item.unitPriceMinor)}
                    </td>
                    <td className="py-4 px-2 text-right text-gray-600">
                      {item.taxRateBps ? `${item.taxRateBps / 100}%` : "0%"}
                    </td>
                    <td className="py-4 px-2 text-right font-medium text-gray-900">
                      {formatINR(item.totalAmountMinor || item.amountMinor)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">
                    No items in proposal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-start gap-8">
          <div className="max-w-xs space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Terms & Conditions
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              This quotation is subject to Brightloop standard cloud terms. Upon acceptance, our team
              will initialize provisioning and deliver your subscription contract.
            </p>
          </div>

          <div className="w-full sm:w-80 space-y-2.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-medium text-gray-900">
                {formatINR(quotation.subtotalAmountMinor)}
              </span>
            </div>

            {Number(quotation.discountAmountMinor || 0) > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount:</span>
                <span>-{formatINR(quotation.discountAmountMinor)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Tax (GST):</span>
              <span>{formatINR(quotation.taxAmountMinor)}</span>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
              <span className="text-base font-bold text-gray-900">Proposed Total:</span>
              <span className="text-xl font-black text-gray-900">
                {formatINR(quotation.totalAmountMinor)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
