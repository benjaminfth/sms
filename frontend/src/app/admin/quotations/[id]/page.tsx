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
import { QuotationWithDetailsDTO, QuotationStatus } from "@sms/shared";
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
      alert(err.message || `Failed to ${actionType} quotation`);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-20 text-center text-slate-400">Loading quotation details...</div>
      </DashboardShell>
    );
  }

  if (error || !quotation) {
    return (
      <DashboardShell>
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl">
          {error || "Quotation not found"}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title={quotation.quotationNumber}
        description={`Quotation generated on ${formatDate(quotation.createdAt)}`}
      >
        <div className="flex items-center space-x-2">
            <Link
              href="/admin/quotations"
              className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 mr-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              All Quotations
            </Link>

            {/* Lifecycle Action Buttons */}
            {quotation.status === QuotationStatus.DRAFT && (
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: "Send Quotation",
                    description: `Mark quotation ${quotation.quotationNumber} as SENT to the customer?`,
                    action: () => handleAction("send"),
                  })
                }
                className="inline-flex items-center px-3.5 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Send Quotation
              </button>
            )}

            {quotation.status === QuotationStatus.SENT && (
              <>
                <button
                  onClick={() =>
                    setConfirmDialog({
                      isOpen: true,
                      title: "Accept Quotation",
                      description: `Record acceptance of quotation ${quotation.quotationNumber}?`,
                      action: () => handleAction("accept"),
                    })
                  }
                  className="inline-flex items-center px-3.5 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Accept
                </button>
                <button
                  onClick={() =>
                    setConfirmDialog({
                      isOpen: true,
                      title: "Reject Quotation",
                      description: `Record customer rejection of quotation ${quotation.quotationNumber}?`,
                      action: () => handleAction("reject"),
                    })
                  }
                  className="inline-flex items-center px-3.5 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Reject
                </button>
                <button
                  onClick={() =>
                    setConfirmDialog({
                      isOpen: true,
                      title: "Expire Quotation",
                      description: `Mark quotation ${quotation.quotationNumber} as EXPIRED?`,
                      action: () => handleAction("expire"),
                    })
                  }
                  className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                >
                  <Clock className="w-4 h-4 mr-1.5 text-slate-500" />
                  Expire
                </button>
              </>
            )}

            {quotation.status === QuotationStatus.ACCEPTED && !quotation.subscription && (
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: "Convert to Subscription",
                    description: `Convert accepted quotation ${quotation.quotationNumber} into an active monthly recurring subscription?`,
                    action: () => handleAction("convert"),
                  })
                }
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Convert to Subscription
              </button>
            )}

            {quotation.subscription && (
              <Link
                href={`/admin/subscriptions/${quotation.subscription.id}`}
                className="inline-flex items-center px-3.5 py-2 border border-indigo-300 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
              >
                <Repeat className="w-4 h-4 mr-1.5" />
                View Subscription ({quotation.subscription.subscriptionNumber})
              </Link>
            )}
          </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Customer Information Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Customer Details
            </h3>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm">{quotation.customer?.fullName}</h4>
            {quotation.customer?.companyName && (
              <p className="text-xs text-slate-600">{quotation.customer.companyName}</p>
            )}
          </div>
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{quotation.customer?.email}</span>
            </div>
            {quotation.customer?.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{quotation.customer.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Commercial Status Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Quotation Status
            </h3>
            <StatusBadge status={quotation.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Valid Until</span>
              <span className="font-medium text-slate-800 font-mono">
                {formatDate(quotation.validUntil)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Currency</span>
              <span className="font-medium text-slate-800 uppercase font-mono">
                {quotation.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Total Summary Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Quotation Value
            </h3>
          </div>
          <div className="py-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              <MoneyDisplay amountMinor={quotation.totalAmountMinor} currency={quotation.currency} />
            </span>
            <span className="text-xs text-slate-500 block mt-1">Includes applicable GST and discounts</span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-800">Quotation Line Items</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
              <th className="py-3 px-4">Item & Description</th>
              <th className="py-3 px-4 text-right">Quantity</th>
              <th className="py-3 px-4 text-right">Unit Price</th>
              <th className="py-3 px-4 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {quotation.items.map((it) => (
              <tr key={it.id} className="hover:bg-slate-50/60">
                <td className="py-3.5 px-4">
                  <p className="font-semibold text-slate-900">{it.description}</p>
                  <span className="text-xs text-slate-400 font-mono">
                    SKU: {it.productVariant?.sku || it.product?.sku || "N/A"}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                  {parseFloat(it.quantity).toFixed(2)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                  <MoneyDisplay amountMinor={it.unitPriceMinor} currency={quotation.currency} />
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                  <MoneyDisplay amountMinor={it.totalAmountMinor} currency={quotation.currency} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Terms & Conditions */}
      {quotation.notes && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-8">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Commercial Terms & Notes
          </h3>
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
            {quotation.notes}
          </p>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </DashboardShell>
  );
}
