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
  Receipt,
  Mail,
} from "lucide-react";

export default function InvoiceDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceWithDetailsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [voiding, setVoiding] = useState(false);
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
    setVoiding(true);
    try {
      await api.post(`/invoices/${id}/void`, { reason: "Voided by admin operator" });
      setShowVoidDialog(false);
      fetchInvoice();
    } catch (err: any) {
      setError(err.message || "Failed to void invoice");
    } finally {
      setVoiding(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-20 text-center text-[#64748B] text-[13px]">
          Loading commercial invoice details...
        </div>
      </DashboardShell>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardShell>
        <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] p-6 rounded-[10px] text-[13px]">
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
      <div className="mb-4">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center text-[12px] font-medium text-[#64748B] hover:text-[#172033] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Invoices
        </Link>
      </div>

      <PageHeader
        title={invoice.invoiceNumber}
        description={`Commercial billing statement issued on ${formatDate(invoice.createdAt)}`}
        badge={<StatusBadge status={invoice.status} />}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* DRAFT -> Confirm */}
          {invoice.status === InvoiceStatus.DRAFT && (
            <button
              onClick={handleConfirmInvoice}
              disabled={confirming}
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-white bg-[#10B981] hover:bg-[#059669] shadow-xs disabled:opacity-50 transition"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              {confirming ? "Confirming..." : "Confirm Invoice (OPEN)"}
            </button>
          )}

          {/* ISSUED -> Send / Resend Email */}
          {invoice.status !== InvoiceStatus.DRAFT && (
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#315CF5] bg-[#315CF5]/10 hover:bg-[#315CF5]/20 border border-[#315CF5]/30 shadow-xs disabled:opacity-50 transition"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {sendingEmail ? "Sending..." : "Send Email"}
            </button>
          )}

          <Link
            href={`/admin/invoices/${invoice.id}/print`}
            target="_blank"
            className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-[#64748B]" />
            Print Invoice
          </Link>

          {canVoid && (
            <button
              onClick={() => setShowVoidDialog(true)}
              disabled={voiding}
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#E11D48] bg-[#FFF1F2] border border-[#FECDD3] hover:bg-[#FFE4E6] shadow-xs transition"
            >
              <Ban className="w-3.5 h-3.5 mr-1.5" />
              Void Invoice
            </button>
          )}
        </div>
      </PageHeader>

      {/* Invoice Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF1]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">Customer</span>
            <Building className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="mt-2.5">
            <p className="text-[14px] font-semibold text-[#172033]">{invoice.customer?.fullName}</p>
            <p className="text-[12px] text-[#64748B] mt-0.5">{invoice.customer?.companyName || "Individual Account"}</p>
            <p className="text-[12px] font-mono text-[#64748B] mt-1">{invoice.customer?.email}</p>
            {invoice.customer?.gstOrTaxId && (
              <p className="text-[11px] text-[#64748B] font-mono mt-1">Tax ID: {invoice.customer.gstOrTaxId}</p>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF1]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">Payment Term</span>
            <Calendar className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="mt-2.5 space-y-1 text-[12px] text-[#64748B]">
            <div>Due Date: <span className="font-mono text-[#172033] font-medium">{formatDate(invoice.dueDate)}</span></div>
            {invoice.paidAt && (
              <div className="text-[#10B981]">
                Paid Date: <span className="font-mono font-medium">{formatDate(invoice.paidAt)}</span>
              </div>
            )}
            <div className="text-[11px] text-[#64748B] pt-1">
              Issued: <span className="font-mono text-[#172033]">{formatDate(invoice.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF1]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">Billing Period</span>
            <Repeat className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="mt-2.5 text-[12px]">
            {invoice.billingPeriodStart && invoice.billingPeriodEnd ? (
              <div className="font-mono text-[#172033] space-y-0.5">
                <div>From: {formatDate(invoice.billingPeriodStart)}</div>
                <div>To: {formatDate(invoice.billingPeriodEnd)}</div>
              </div>
            ) : (
              <span className="text-[#64748B] italic">One-time billing line</span>
            )}
            {invoice.subscription && (
              <Link
                href={`/admin/subscriptions/${invoice.subscription.id}`}
                className="text-[12px] text-[#315CF5] hover:underline font-mono block mt-1.5 truncate"
              >
                Sub #{invoice.subscription.subscriptionNumber}
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF1]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">Balance Due</span>
            <CreditCard className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="mt-2">
            <div className="text-[20px] font-bold text-[#E11D48] font-mono">
              <MoneyDisplay amountMinor={invoice.balanceDueMinor} currency={invoice.currency} />
            </div>
            <div className="text-[11px] text-[#64748B] flex justify-between mt-1">
              <span>Total: <MoneyDisplay amountMinor={invoice.totalAmountMinor} currency={invoice.currency} /></span>
              <span>Paid: <MoneyDisplay amountMinor={invoice.amountPaidMinor} currency={invoice.currency} /></span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Line Items (Frozen Snapshot) */}
      <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden mb-6">
        <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[#172033]">
              Line Items (Historical Commercial Snapshot)
            </h2>
            <p className="text-[12px] text-[#64748B] mt-0.5">{invoice.items?.length || 0} item(s) invoiced</p>
          </div>
          {invoice.subscription && (
            <Link
              href={`/admin/subscriptions/${invoice.subscription.id}`}
              className="text-[12px] font-mono text-[#315CF5] hover:underline flex items-center space-x-1"
            >
              <Repeat className="w-3 h-3 mr-1" />
              <span>{invoice.subscription.subscriptionNumber}</span>
            </Link>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4 text-right">Quantity</th>
                <th className="py-2.5 px-4 text-right">Unit Price</th>
                <th className="py-2.5 px-4 text-right">Tax (GST)</th>
                <th className="py-2.5 px-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1]">
              {invoice.items?.map((it: any) => (
                <tr key={it.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4 font-medium text-[#172033]">{it.description}</td>
                  <td className="py-3 px-4 text-right font-mono text-[#64748B]">
                    {parseFloat(it.quantity).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#172033]">
                    <MoneyDisplay amountMinor={it.unitPriceMinor} currency={invoice.currency} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#64748B]">
                    <MoneyDisplay amountMinor={it.taxAmountMinor} currency={invoice.currency} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-[#172033]">
                    <MoneyDisplay amountMinor={it.totalAmountMinor} currency={invoice.currency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary Breakdown */}
        <div className="p-6 bg-[#F8FAFC]/50 border-t border-[#E5EAF1] flex justify-end">
          <div className="w-72 space-y-2 text-[13px]">
            <div className="flex justify-between text-[#64748B]">
              <span>Subtotal:</span>
              <span className="font-mono text-[#172033]">
                <MoneyDisplay amountMinor={invoice.subtotalMinor} currency={invoice.currency} />
              </span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>Taxes:</span>
              <span className="font-mono text-[#172033]">
                <MoneyDisplay amountMinor={invoice.taxAmountMinor} currency={invoice.currency} />
              </span>
            </div>
            {BigInt(invoice.discountAmountMinor) > BigInt(0) && (
              <div className="flex justify-between text-[#10B981]">
                <span>Discounts Applied:</span>
                <span className="font-mono">
                  -<MoneyDisplay amountMinor={invoice.discountAmountMinor} currency={invoice.currency} />
                </span>
              </div>
            )}
            <div className="border-t border-[#E5EAF1] pt-2 flex justify-between text-[14px] font-bold text-[#172033]">
              <span>Total Invoice Amount:</span>
              <span className="font-mono">
                <MoneyDisplay amountMinor={invoice.totalAmountMinor} currency={invoice.currency} />
              </span>
            </div>
            <div className="flex justify-between text-[#10B981] pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono font-medium">
                <MoneyDisplay amountMinor={invoice.amountPaidMinor} currency={invoice.currency} />
              </span>
            </div>
            <div className="flex justify-between text-[#E11D48] font-bold border-t border-[#E5EAF1] pt-1.5">
              <span>Balance Outstanding:</span>
              <span className="font-mono">
                <MoneyDisplay amountMinor={invoice.balanceDueMinor} currency={invoice.currency} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Allocations Section (Developer 3 Integration) */}
      <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden mb-6">
        <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-[#64748B]" />
            <h3 className="text-[14px] font-semibold text-[#172033]">Payment Allocations</h3>
          </div>
          <span className="text-[12px] text-[#64748B]">
            {invoice.paymentAllocations?.length || 0} allocation(s) recorded
          </span>
        </div>

        {invoice.paymentAllocations && invoice.paymentAllocations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                  <th className="py-2.5 px-4">Allocation ID</th>
                  <th className="py-2.5 px-4">Payment Reference</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Allocated Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {invoice.paymentAllocations.map((pa: any) => (
                  <tr key={pa.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-mono text-[12px] text-[#64748B]">
                      {pa.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-mono text-[12px] font-medium text-[#315CF5]">
                      {pa.payment?.paymentReference || pa.paymentId}
                    </td>
                    <td className="py-3 px-4 font-mono text-[12px] text-[#64748B]">
                      {formatDate(pa.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-[#10B981]">
                      <MoneyDisplay amountMinor={pa.allocatedAmountMinor} currency={invoice.currency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-[#64748B] text-[12px]">
            No payment allocations recorded for this invoice yet.
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
