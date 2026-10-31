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
import { InvoiceWithDetailsDTO, InvoiceStatus } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Printer,
  Ban,
  Building,
  Calendar,
  CreditCard,
  Repeat,
  Send,
  CheckCircle,
} from "lucide-react";

export default function InvoiceDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceWithDetailsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Void confirmation dialog state
  const [showVoidDialog, setShowVoidDialog] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<InvoiceWithDetailsDTO>(`/invoices/${id}`);
      if (res.success && res.data) {
        setInvoice(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleConfirmInvoice = async () => {
    setConfirming(true);
    try {
      await api.post(`/invoices/${id}/confirm`, { paymentTerms: "NET_15" });
      fetchInvoice();
    } catch (err: any) {
      alert(err.message || "Failed to confirm invoice");
    } finally {
      setConfirming(false);
    }
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      await api.post(`/invoices/${id}/send`, {});
      alert("Invoice notification email sent successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to send invoice notification email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleVoid = async () => {
    try {
      await api.post(`/invoices/${id}/void`, { reason: "Voided by admin" });
      fetchInvoice();
    } catch (err: any) {
      alert(err.message || "Failed to void invoice");
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-20 text-center text-slate-400">Loading invoice details...</div>
      </DashboardShell>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardShell>
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl">
          {error || "Invoice not found"}
        </div>
      </DashboardShell>
    );
  }

  const canVoid =
    invoice.status !== InvoiceStatus.PAID &&
    invoice.status !== InvoiceStatus.VOID &&
    BigInt(invoice.amountPaidMinor) === BigInt(0);

  return (
    <DashboardShell>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`Issued on ${formatDate(invoice.createdAt)}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/invoices"
            className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 mr-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Invoices
          </Link>

          {/* DRAFT -> Confirm */}
          {invoice.status === InvoiceStatus.DRAFT && (
            <button
              onClick={handleConfirmInvoice}
              disabled={confirming}
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              {confirming ? "Confirming..." : "Confirm Invoice (OPEN)"}
            </button>
          )}

          {/* ISSUED -> Send / Resend Email */}
          {invoice.status !== InvoiceStatus.DRAFT && (
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="inline-flex items-center px-3.5 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {sendingEmail ? "Sending..." : "Send Email"}
            </button>
          )}

          <Link
            href={`/admin/invoices/${invoice.id}/print`}
            target="_blank"
            className="inline-flex items-center px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2 text-slate-500" />
            Print View
          </Link>

          {canVoid && (
            <button
              onClick={() => setShowVoidDialog(true)}
              className="inline-flex items-center px-3.5 py-2 border border-rose-300 rounded-lg text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 shadow-sm"
            >
              <Ban className="w-4 h-4 mr-1.5" />
              Void Invoice
            </button>
          )}
        </div>
      </PageHeader>

      {/* Invoice Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Customer Details
            </span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-900 text-sm">{invoice.customer?.fullName}</p>
          <p className="text-xs text-slate-500">{invoice.customer?.companyName || "Individual"}</p>
          <p className="text-xs text-slate-400 font-mono">{invoice.customer?.email}</p>
          {invoice.customer?.gstOrTaxId && (
            <p className="text-xs text-slate-400 font-mono">GST: {invoice.customer.gstOrTaxId}</p>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status & Workflow
            </span>
            <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
              {invoice.businessStatus || invoice.status}
            </span>
          </div>
          <div className="space-y-1 text-xs text-slate-600">
            <div>Due Date: <span className="font-mono font-medium">{formatDate(invoice.dueDate)}</span></div>
            {invoice.paidAt && (
              <div className="text-emerald-700">Paid At: <span className="font-mono font-medium">{formatDate(invoice.paidAt)}</span></div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Billing Period
            </span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          {invoice.billingPeriodStart && invoice.billingPeriodEnd ? (
            <div className="text-xs font-mono text-slate-700 space-y-0.5">
              <div>From: {formatDate(invoice.billingPeriodStart)}</div>
              <div>To: {formatDate(invoice.billingPeriodEnd)}</div>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">One-time invoice</span>
          )}
          {invoice.subscription && (
            <Link
              href={`/admin/subscriptions/${invoice.subscription.id}`}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium inline-flex items-center mt-1"
            >
              <Repeat className="w-3 h-3 mr-1" />
              Subscription: {invoice.subscription.subscriptionNumber}
            </Link>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Outstanding Balance
            </span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-rose-600 font-mono">
            <MoneyDisplay amountMinor={invoice.balanceDueMinor} currency={invoice.currency} />
          </p>
          <div className="text-xs text-slate-500 flex justify-between">
            <span>Total: <MoneyDisplay amountMinor={invoice.totalAmountMinor} currency={invoice.currency} /></span>
            <span>Paid: <MoneyDisplay amountMinor={invoice.amountPaidMinor} currency={invoice.currency} /></span>
          </div>
        </div>
      </div>

      {/* Invoice Line Items (Frozen Snapshot) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            Line Items (Historical Commercial Snapshot)
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {invoice.items?.length || 0} item(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Tax Amount</th>
                <th className="py-3 px-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {invoice.items?.map((it: any) => (
                <tr key={it.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-900">{it.description}</p>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                    {parseFloat(it.quantity).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                    <MoneyDisplay amountMinor={it.unitPriceMinor} currency={invoice.currency} />
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                    <MoneyDisplay amountMinor={it.taxAmountMinor} currency={invoice.currency} />
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                    <MoneyDisplay amountMinor={it.totalAmountMinor} currency={invoice.currency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary Breakdown */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-200 flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">
                <MoneyDisplay amountMinor={invoice.subtotalMinor} currency={invoice.currency} />
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxes:</span>
              <span className="font-mono font-medium">
                <MoneyDisplay amountMinor={invoice.taxAmountMinor} currency={invoice.currency} />
              </span>
            </div>
            {BigInt(invoice.discountAmountMinor) > BigInt(0) && (
              <div className="flex justify-between text-emerald-700">
                <span>Discounts Applied:</span>
                <span className="font-mono font-medium">
                  -<MoneyDisplay amountMinor={invoice.discountAmountMinor} currency={invoice.currency} />
                </span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-extrabold text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono">
                <MoneyDisplay amountMinor={invoice.totalAmountMinor} currency={invoice.currency} />
              </span>
            </div>
            <div className="flex justify-between text-emerald-700 pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono font-medium">
                <MoneyDisplay amountMinor={invoice.amountPaidMinor} currency={invoice.currency} />
              </span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
              <span>Balance Due:</span>
              <span className="font-mono">
                <MoneyDisplay amountMinor={invoice.balanceDueMinor} currency={invoice.currency} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Allocations Section (Developer 3 Integration) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-800">
              Payment Allocations (Developer 3 Payments Module)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {invoice.paymentAllocations?.length || 0} payment(s) allocated
          </span>
        </div>

        {invoice.paymentAllocations && invoice.paymentAllocations.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Payment Reference</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4 text-right">Allocated Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {invoice.paymentAllocations.map((pa: any) => (
                <tr key={pa.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                    {pa.payment?.paymentReference || pa.paymentId}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">
                    {pa.createdAt ? formatDate(pa.createdAt) : "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                    <MoneyDisplay amountMinor={pa.allocatedAmountMinor} currency={invoice.currency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-center text-slate-400 text-xs">
            No payments allocated to this invoice yet. Payments processed by Developer 3 will appear here automatically.
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showVoidDialog}
        title="Void Invoice"
        description={`Are you sure you want to VOID invoice ${invoice.invoiceNumber}? Once voided, it cannot be paid or reversed.`}
        onConfirm={handleVoid}
        onCancel={() => setShowVoidDialog(false)}
      />
    </DashboardShell>
  );
}
