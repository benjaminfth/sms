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
import { InvoiceWithDetailsDTO, InvoiceStatus, formatMinorToCurrency } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Printer,
  Ban,
  Building,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Repeat,
  CheckCircle2,
  Receipt,
} from "lucide-react";

export default function InvoiceDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceWithDetailsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Void confirmation dialog state
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voiding, setVoiding] = useState(false);

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
        <div className="py-20 text-center text-[#94A3B8]">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#315CF5] border-t-transparent" />
          <p className="mt-2 text-[12px]">Loading financial invoice snapshot...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardShell>
        <div className="bg-[#FDEDED] border border-[#F8C6C6] text-[#D14343] p-6 rounded-[10px] text-[13px]">
          {error || "Invoice record not found"}
        </div>
      </DashboardShell>
    );
  }

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
        <div className="flex items-center space-x-2">
          <Link
            href={`/admin/invoices/${invoice.id}/print`}
            target="_blank"
            className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-[#64748B]" />
            Print / PDF
          </Link>

          {invoice.status !== InvoiceStatus.VOID && invoice.status !== InvoiceStatus.PAID && (
            <button
              onClick={() => setShowVoidDialog(true)}
              className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#D14343] bg-white border border-[#F8C6C6] hover:bg-[#FDEDED] transition"
            >
              <Ban className="w-3.5 h-3.5 mr-1.5" />
              Void Invoice
            </button>
          )}
        </div>
      </PageHeader>

      {/* Financial Snapshot Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1">
            <span>Customer</span>
            <Building className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="font-semibold text-[#172033] text-[14px] truncate">
            {invoice.customer?.fullName}
          </p>
          <p className="text-[12px] text-[#64748B] truncate mt-0.5">
            {invoice.customer?.companyName || "Individual Customer"}
          </p>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1">
            <span>Payment Due Date</span>
            <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="font-semibold text-[#172033] text-[14px] font-mono">
            {formatDate(invoice.dueDate)}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Net 15 terms standard
          </p>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1">
            <span>Total Invoiced</span>
            <Receipt className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="font-semibold text-[#172033] text-[18px] font-mono">
            <MoneyDisplay amountMinor={invoice.totalAmountMinor} currency={invoice.currency} />
          </p>
          <p className="text-[11px] text-[#16865B] font-mono mt-0.5">
            Paid: {formatMinorToCurrency(invoice.amountPaidMinor, invoice.currency)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1">
            <span>Outstanding Balance</span>
            <CreditCard className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="font-semibold text-[#C58A24] text-[18px] font-mono">
            <MoneyDisplay amountMinor={invoice.balanceDueMinor} currency={invoice.currency} />
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            {BigInt(invoice.balanceDueMinor) === BigInt(0) ? "Fully Settled" : "Awaiting Settlement"}
          </p>
        </div>
      </div>

      {/* Invoice Line Items (Frozen Snapshot) */}
      <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden mb-6">
        <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[#172033]">
              Line Items (Historical Commercial Snapshot)
            </h2>
            <p className="text-[12px] text-[#64748B] mt-0.5">{invoice.items.length} item(s) invoiced</p>
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
              {invoice.items.map((it) => (
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
        <div className="p-6 bg-[#F8FAFC] border-t border-[#E5EAF1] flex justify-end">
          <div className="w-72 space-y-2 text-[13px]">
            <div className="flex justify-between text-[#64748B]">
              <span>Subtotal:</span>
              <span className="font-mono text-[#172033]">
                <MoneyDisplay amountMinor={invoice.subtotalMinor} currency={invoice.currency} />
              </span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>Taxes (GST 18%):</span>
              <span className="font-mono text-[#172033]">
                <MoneyDisplay amountMinor={invoice.taxAmountMinor} currency={invoice.currency} />
              </span>
            </div>
            {BigInt(invoice.discountAmountMinor) > BigInt(0) && (
              <div className="flex justify-between text-[#16865B]">
                <span>Discounts Applied:</span>
                <span className="font-mono">
                  -<MoneyDisplay amountMinor={invoice.discountAmountMinor} currency={invoice.currency} />
                </span>
              </div>
            )}
            <div className="border-t border-[#E5EAF1] pt-2 flex justify-between text-[15px] font-semibold text-[#172033]">
              <span>Grand Total:</span>
              <span className="font-mono text-[#315CF5]">
                <MoneyDisplay amountMinor={invoice.totalAmountMinor} currency={invoice.currency} />
              </span>
            </div>
            <div className="flex justify-between text-[#16865B]">
              <span>Amount Paid:</span>
              <span className="font-mono">
                <MoneyDisplay amountMinor={invoice.amountPaidMinor} currency={invoice.currency} />
              </span>
            </div>
            <div className="flex justify-between text-[#172033] font-semibold border-t border-[#E5EAF1] pt-1">
              <span>Balance Due:</span>
              <span className="font-mono text-[#C58A24]">
                <MoneyDisplay amountMinor={invoice.balanceDueMinor} currency={invoice.currency} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Allocations Section */}
      <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden mb-6">
        <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[#172033]">Payment Allocations</h2>
            <p className="text-[12px] text-[#64748B] mt-0.5">
              Settled payments mapped to this invoice balance
            </p>
          </div>
          <span className="text-[11px] font-medium text-[#64748B] bg-[#F8FAFC] px-2 py-0.5 rounded-[4px] border border-[#E5EAF1]">
            {invoice.paymentAllocations?.length || 0} Allocated
          </span>
        </div>

        {invoice.paymentAllocations && invoice.paymentAllocations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                  <th className="py-2.5 px-4">Payment Reference</th>
                  <th className="py-2.5 px-4">Payment Date</th>
                  <th className="py-2.5 px-4 text-right">Allocated Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {invoice.paymentAllocations.map((pa: any) => (
                  <tr key={pa.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-4 font-mono font-medium text-[#172033]">
                      <Link
                        href={`/admin/payments/${pa.paymentId}`}
                        className="text-[#315CF5] hover:underline"
                      >
                        {pa.payment?.paymentReference || pa.paymentId}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#64748B]">
                      {pa.createdAt ? formatDate(pa.createdAt) : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-[#16865B]">
                      <MoneyDisplay amountMinor={pa.allocatedAmountMinor} currency={invoice.currency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-[#94A3B8] text-[12px]">
            No payment allocations recorded yet. When payments are recorded in the Payments Ledger, they can be matched here.
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showVoidDialog}
        title="Void Invoice"
        description={`Are you sure you want to VOID invoice ${invoice.invoiceNumber}? Once voided, it cannot be paid or reversed.`}
        confirmLabel="Void Invoice"
        variant="danger"
        loading={voiding}
        onConfirm={handleVoid}
        onCancel={() => setShowVoidDialog(false)}
      />
    </DashboardShell>
  );
}
