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
import { InvoiceStatus, PaymentTerms } from "@sms/shared";
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
  MailCheck,
} from "lucide-react";

export default function InvoiceDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Void confirmation dialog state
  const [showVoidDialog, setShowVoidDialog] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/invoices/${id}`);
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

      {/* Line Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Frozen Invoice Line Items</h2>
          <span className="text-xs text-slate-500 font-mono">{invoice.items?.length || 0} line items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3 text-right">Quantity</th>
                <th className="px-6 py-3 text-right">Unit Price</th>
                <th className="px-6 py-3 text-right">Tax Amount</th>
                <th className="px-6 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items?.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs">
                    {parseFloat(item.quantity).toFixed(3)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs">
                    <MoneyDisplay amountMinor={item.unitPriceMinor} currency={invoice.currency} />
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-slate-500">
                    <MoneyDisplay amountMinor={item.taxAmountMinor} currency={invoice.currency} />
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs font-semibold text-slate-900">
                    <MoneyDisplay amountMinor={item.totalAmountMinor} currency={invoice.currency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showVoidDialog}
        title="Void Invoice"
        description={`Are you sure you want to void invoice ${invoice.invoiceNumber}? This action is permanent and cannot be undone.`}
        onConfirm={handleVoid}
        onCancel={() => setShowVoidDialog(false)}
      />
    </DashboardShell>
  );
}
