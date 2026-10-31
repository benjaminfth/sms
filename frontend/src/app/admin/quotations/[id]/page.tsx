"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { api } from "@/lib/api-client";
import { QuotationWithDetailsDTO, QuotationStatus, formatMinorToCurrency } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Repeat,
  Building,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";

export default function QuotationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [quotation, setQuotation] = useState<QuotationWithDetailsDTO | null>(null);
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

  const fetchQuotation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<QuotationWithDetailsDTO>(`/quotations/${id}`);
      if (res.success && res.data) {
        setQuotation(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load quotation");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  const handleAction = async (actionType: "send" | "accept" | "reject" | "expire" | "convert") => {
    try {
      if (actionType === "convert") {
        const res = await api.post<any>(`/quotations/${id}/convert`, { billingInterval: "MONTHLY" });
        if (res.success && res.data) {
          router.push(`/admin/subscriptions/${res.data.id}`);
          return;
        }
      } else {
        await api.post(`/quotations/${id}/${actionType}`);
      }
      fetchQuotation();
    } catch (err: any) {
      setError(err.message || `Failed to perform ${actionType} action.`);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-20 text-center text-[#94A3B8]">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#315CF5] border-t-transparent" />
          <p className="mt-2 text-[12px]">Loading quotation details...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !quotation) {
    return (
      <DashboardShell>
        <div className="bg-[#FDEDED] border border-[#F8C6C6] text-[#D14343] p-6 rounded-[10px] text-[13px]">
          {error || "Quotation not found"}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-4">
        <Link
          href="/admin/quotations"
          className="inline-flex items-center text-[12px] font-medium text-[#64748B] hover:text-[#172033] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Quotations
        </Link>
      </div>

      <PageHeader
        title={quotation.quotationNumber}
        description={`Commercial quotation generated on ${formatDate(quotation.createdAt)}`}
        badge={<StatusBadge status={quotation.status} />}
      >
        <div className="flex items-center space-x-2">
          {quotation.status === QuotationStatus.DRAFT && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Send Quotation",
                  description: `Mark quotation ${quotation.quotationNumber} as SENT to customer?`,
                  action: () => handleAction("send"),
                })
              }
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send to Customer
            </button>
          )}

          {quotation.status === QuotationStatus.SENT && (
            <>
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: "Accept Quotation",
                    description: `Record client acceptance for ${quotation.quotationNumber}?`,
                    action: () => handleAction("accept"),
                  })
                }
                className="inline-flex items-center px-3 py-1.5 rounded-[8px] text-[13px] font-medium text-white bg-[#16865B] hover:bg-[#126b48] shadow-xs transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Mark Accepted
              </button>
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: "Reject Quotation",
                    description: `Record client rejection for ${quotation.quotationNumber}?`,
                    action: () => handleAction("reject"),
                  })
                }
                className="inline-flex items-center px-3 py-1.5 rounded-[8px] text-[13px] font-medium text-[#D14343] bg-white border border-[#F8C6C6] hover:bg-[#FDEDED] transition"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Reject
              </button>
            </>
          )}

          {quotation.status === QuotationStatus.ACCEPTED && !quotation.subscription && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Convert to Subscription",
                  description: `Generate active recurring subscription from quotation ${quotation.quotationNumber}?`,
                  action: () => handleAction("convert"),
                })
              }
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] shadow-xs transition"
            >
              <Repeat className="w-3.5 h-3.5 mr-1.5" />
              Convert to Subscription
            </button>
          )}
        </div>
      </PageHeader>

      {/* Document View Container */}
      <div className="bg-white rounded-[12px] border border-[#E5EAF1] p-8 shadow-xs max-w-4xl space-y-8">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-[#E5EAF1]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-[16px] text-[#172033]">Brightloop Software</span>
              <span className="text-[10px] font-semibold text-[#315CF5] bg-[#EFF4FE] px-1.5 py-0.5 rounded-[4px]">
                OFFICIAL QUOTATION
              </span>
            </div>
            <p className="text-[12px] text-[#64748B] mt-1">
              Subscription Management & Recurring Billing Platform
            </p>
            <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
              GSTIN: 29AAACB1234F1Z0 | sales@brightloop.io
            </p>
          </div>

          <div className="text-right">
            <p className="text-[11px] text-[#64748B] uppercase tracking-wider font-medium">Quotation #</p>
            <p className="font-mono font-semibold text-[16px] text-[#172033]">
              {quotation.quotationNumber}
            </p>
            <div className="text-[12px] text-[#64748B] mt-1 space-y-0.5">
              <div>Issued: <span className="font-mono text-[#172033]">{formatDate(quotation.createdAt)}</span></div>
              <div>Valid Until: <span className="font-mono font-medium text-[#C58A24]">{formatDate(quotation.validUntil)}</span></div>
            </div>
          </div>
        </div>

        {/* Customer & Billing Recipient */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#F8FAFC] p-4 rounded-[8px] border border-[#E5EAF1] text-[13px]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] mb-1">
              Quotation Prepared For
            </p>
            <p className="font-semibold text-[#172033]">{quotation.customer?.fullName}</p>
            {quotation.customer?.companyName && (
              <p className="text-[12px] text-[#64748B]">{quotation.customer.companyName}</p>
            )}
            <p className="text-[12px] text-[#64748B] mt-1">{quotation.customer?.email}</p>
            {quotation.customer?.phone && (
              <p className="text-[12px] text-[#64748B] font-mono">{quotation.customer.phone}</p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] mb-1">
              Billing & Tax Coordinates
            </p>
            <p className="text-[12px] text-[#64748B]">
              {[quotation.customer?.city, quotation.customer?.state, quotation.customer?.country]
                .filter(Boolean)
                .join(", ") || "No address on file."}
            </p>
            {quotation.customer?.gstOrTaxId && (
              <p className="text-[11px] font-mono text-[#172033] mt-1">
                GSTIN: <strong>{quotation.customer.gstOrTaxId}</strong>
              </p>
            )}
            {quotation.subscription && (
              <div className="mt-3 pt-2 border-t border-[#E5EAF1]">
                <span className="text-[11px] text-[#16865B] font-medium flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Converted to Subscription:
                </span>
                <Link
                  href={`/admin/subscriptions/${quotation.subscription.id}`}
                  className="font-mono text-[12px] text-[#315CF5] hover:underline"
                >
                  {quotation.subscription.subscriptionNumber}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-[#E5EAF1] rounded-[8px] overflow-hidden">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                <th className="py-2.5 px-4">Item & Description</th>
                <th className="py-2.5 px-4 text-right">Qty</th>
                <th className="py-2.5 px-4 text-right">Unit Price</th>
                                <th className="py-2.5 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1]">
              {quotation.items.map((it) => (
                <tr key={it.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4">
                    <p className="font-medium text-[#172033]">{it.description}</p>
                    {it.product && (
                      <span className="text-[11px] text-[#64748B] font-mono">
                        {it.product.sku} {it.productVariant ? `• ${it.productVariant.name}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#64748B]">
                    {parseFloat(it.quantity).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#172033]">
                    {formatMinorToCurrency(it.unitPriceMinor, quotation.currency)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-[#172033]">
                    {formatMinorToCurrency(it.totalAmountMinor, quotation.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex justify-end pt-2">
          <div className="w-72 space-y-1.5 text-[13px]">
            <div className="border-t border-[#E5EAF1] pt-2 flex justify-between text-[15px] font-semibold text-[#172033]">
              <span>Quotation Total:</span>
              <span className="font-mono text-[#315CF5]">
                {formatMinorToCurrency(quotation.totalAmountMinor, quotation.currency)}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] text-right">
              Includes all line items and applicable taxes
            </p>
          </div>
        </div>

        {quotation.notes && (
          <div className="p-3 bg-[#F8FAFC] rounded-[8px] border border-[#E5EAF1] text-[12px] text-[#64748B]">
            <span className="font-medium text-[#172033] block mb-0.5">Notes:</span>
            {quotation.notes}
          </div>
        )}
      </div>

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
