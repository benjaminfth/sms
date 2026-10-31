"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  ArrowLeft,
  FileText,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  X,
} from "lucide-react";

export default function CustomerQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"ACCEPT" | "REJECT" | null>(null);

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

  const handleRespond = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setResponding(true);
    setConfirmAction(null);

    try {
      const endpoint =
        action === "ACCEPT"
          ? `/portal/quotations/${id}/accept`
          : `/portal/quotations/${id}/reject`;

      const res = await api.post<any>(endpoint, {});
      if (res.success && res.data) {
        setQuotation(res.data);
      } else {
        setError(res.error?.message || `Failed to ${action.toLowerCase()} quotation`);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-text-secondary">
        Loading quotation document...
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <AlertTriangle className="w-10 h-10 text-status-danger mx-auto mb-3" />
        <h2 className="text-[18px] font-semibold text-text-primary">Quotation not found</h2>
        <p className="text-[13px] text-text-secondary mt-1">{error || "The requested proposal does not exist."}</p>
        <Link
          href="/portal/quotations"
          className="mt-5 inline-flex items-center px-4 py-2 rounded-btn text-[13px] font-medium text-white bg-primary-accent hover:bg-primary-hover shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
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
          className="inline-flex items-center text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Quotations
        </Link>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-3.5 py-1.5 border border-border rounded-btn text-[13px] font-medium text-text-primary bg-surface-card hover:bg-surface-canvas shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / PDF
          </button>
          {isPending && (
            <div className="flex items-center gap-2">
              <button
                disabled={responding}
                onClick={() => setConfirmAction("REJECT")}
                className="inline-flex items-center px-3.5 py-1.5 border border-status-danger/30 rounded-btn text-[13px] font-medium text-status-danger bg-surface-card hover:bg-status-danger/10 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Decline
              </button>
              <button
                disabled={responding}
                onClick={() => setConfirmAction("ACCEPT")}
                className="inline-flex items-center px-4 py-1.5 rounded-btn text-[13px] font-medium text-white bg-status-success hover:bg-status-success/90 shadow-xs transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Accept Proposal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Printable Quotation Container */}
      <div className="bg-surface-card rounded-card border border-border shadow-xs overflow-hidden p-8 sm:p-12 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row justify-between items-start pb-8 border-b border-border gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-btn bg-primary-accent flex items-center justify-center text-white shadow-xs">
                <div className="w-3.5 h-3.5 border-2 border-white rounded-[3px] rotate-45 flex items-center justify-center">
                  <div className="w-1 h-1 bg-white rounded-full" />
                </div>
              </div>
              <span className="text-[17px] font-semibold text-text-primary tracking-tight">
                Brightloop SMS
              </span>
            </div>
            <p className="text-[12px] text-text-secondary">Commercial Service & Subscription Proposal</p>
            <p className="text-[11px] text-text-muted mt-0.5">GSTIN: 29AABCU9603R1ZM</p>
          </div>

          <div className="text-left sm:text-right">
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">
              FORMAL QUOTATION
            </h1>
            <p className="text-[13px] font-mono font-medium text-primary-accent mt-0.5">
              {quotation.quotationNumber}
            </p>
            <div className="mt-2">
              <StatusBadge status={quotation.status} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-b border-border text-[13px]">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted block mb-1.5">
              Prepared For
            </span>
            <p className="font-semibold text-text-primary text-[14px]">
              {quotation.customer?.fullName || "Valued Subscriber"}
            </p>
            {quotation.customer?.companyName && (
              <p className="text-text-secondary font-medium">{quotation.customer.companyName}</p>
            )}
            <p className="text-text-secondary mt-0.5">{quotation.customer?.email}</p>
          </div>

          <div className="sm:text-right space-y-1.5">
            <div>
              <span className="text-[12px] text-text-secondary">Quotation Date:</span>
              <span className="ml-2 font-mono font-medium text-text-primary">
                {quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString("en-IN") : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-[12px] text-text-secondary">Valid Until:</span>
              <span className="ml-2 font-mono font-medium text-status-warning">
                {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString("en-IN") : "30 Days"}
              </span>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="py-6 border-b border-border">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] font-medium uppercase text-text-muted tracking-wider">
                <th className="py-2.5 px-2">Description</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-2 text-right">Unit Price</th>
                <th className="py-2.5 px-2 text-right">Tax Rate</th>
                <th className="py-2.5 px-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotation.items && quotation.items.length > 0 ? (
                quotation.items.map((item: any, idx: number) => (
                  <tr key={item.id || idx}>
                    <td className="py-3 px-2">
                      <div className="font-medium text-text-primary">
                        {item.description || item.product?.name || "Service Tier"}
                      </div>
                      {item.product?.sku && (
                        <span className="text-[11px] font-mono text-text-muted">SKU: {item.product.sku}</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-text-secondary">{item.quantity}</td>
                    <td className="py-3 px-2 text-right font-mono text-text-secondary">
                      {formatINR(item.unitPriceMinor)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-text-secondary">
                      {item.taxRateBps ? `${item.taxRateBps / 100}%` : "0%"}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-medium text-text-primary">
                      {formatINR(item.totalAmountMinor || item.amountMinor)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-text-muted">
                    No items in proposal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between items-start gap-8">
          <div className="max-w-xs space-y-2">
            <h4 className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              Terms & Conditions
            </h4>
            <p className="text-[12px] text-text-secondary leading-relaxed">
              This quotation is subject to Brightloop standard cloud subscription terms. Upon acceptance, your subscription will be initialized and recurrent billing schedules scheduled.
            </p>
          </div>

          <div className="w-full sm:w-80 space-y-2 text-[13px]">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal:</span>
              <span className="font-mono text-text-primary">
                {formatINR(quotation.subtotalAmountMinor)}
              </span>
            </div>

            {Number(quotation.discountAmountMinor || 0) > 0 && (
              <div className="flex justify-between text-status-success font-medium">
                <span>Discount:</span>
                <span className="font-mono">-{formatINR(quotation.discountAmountMinor)}</span>
              </div>
            )}

            <div className="flex justify-between text-text-secondary">
              <span>Tax (GST):</span>
              <span className="font-mono text-text-primary">{formatINR(quotation.taxAmountMinor)}</span>
            </div>

            <div className="pt-2.5 border-t border-border flex justify-between items-baseline">
              <span className="text-[14px] font-semibold text-text-primary">Grand Total:</span>
              <span className="text-[18px] font-semibold text-text-primary font-mono tracking-tight">
                {formatINR(quotation.totalAmountMinor)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmAction !== null}
        title={confirmAction === "ACCEPT" ? "Accept Quotation Proposal" : "Decline Quotation Proposal"}
        description={
          confirmAction === "ACCEPT"
            ? "Are you sure you want to ACCEPT this quotation? An official subscription agreement will be activated."
            : "Are you sure you want to DECLINE this quotation proposal?"
        }
        variant={confirmAction === "ACCEPT" ? "primary" : "danger"}
        confirmLabel={confirmAction === "ACCEPT" ? "Confirm & Accept" : "Decline Proposal"}
        onConfirm={handleRespond}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
