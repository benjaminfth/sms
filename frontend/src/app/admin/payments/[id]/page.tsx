"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { api } from "@/lib/api-client";
import { PaymentStatus, formatMinorToCurrency } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  CreditCard,
  Building,
  Calendar,
  Receipt,
  Plus,
  Check,
  X,
} from "lucide-react";

export default function PaymentDetailsPage() {
  const params = useParams();
  const paymentId = params.id as string;

  const [payment, setPayment] = useState<any>(null);
  const [openInvoices, setOpenInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Allocate modal state
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [allocateAmountRupees, setAllocateAmountRupees] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadPayment = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/payments/${paymentId}`);
      if (res.success && res.data) {
        setPayment(res.data);

        // Fetch open invoices for this customer
        if (res.data.customerId) {
          const invRes = await api.get<any[]>("/portal/invoices", {
            customerId: res.data.customerId,
          });
          if (invRes.success && invRes.data) {
            const open = invRes.data.filter(
              (inv: any) =>
                inv.status !== "PAID" &&
                inv.status !== "VOID" &&
                inv.status !== "CANCELLED" &&
                BigInt(inv.balanceDueMinor || 0) > BigInt(0)
            );
            setOpenInvoices(open);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load payment detail:", err);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    if (paymentId) loadPayment();
  }, [paymentId, loadPayment]);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || !allocateAmountRupees) return;

    setAllocating(true);
    setMessage(null);
    try {
      const amountPaise = BigInt(Math.round(parseFloat(allocateAmountRupees) * 100)).toString();
      const res = await api.post(`/payments/${paymentId}/allocate`, {
        invoiceId: selectedInvoiceId,
        amountMinor: amountPaise,
      });

      if (res.success) {
        setMessage({ type: "success", text: "Payment allocated successfully to invoice balance." });
        setShowAllocateModal(false);
        setSelectedInvoiceId("");
        setAllocateAmountRupees("");
        loadPayment();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to allocate payment." });
    } finally {
      setAllocating(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-20 text-center text-[#94A3B8]">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#315CF5] border-t-transparent" />
          <p className="mt-2 text-[12px]">Loading payment details...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!payment) {
    return (
      <DashboardShell>
        <div className="bg-[#FDEDED] border border-[#F8C6C6] text-[#D14343] p-6 rounded-[10px] text-[13px]">
          Payment record not found
        </div>
      </DashboardShell>
    );
  }

  const unallocatedPaise = BigInt(payment.unallocatedAmountMinor || 0);

  return (
    <DashboardShell>
      <div className="mb-4">
        <Link
          href="/admin/payments"
          className="inline-flex items-center text-[12px] font-medium text-[#64748B] hover:text-[#172033] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Payments
        </Link>
      </div>

      <PageHeader
        title={payment.paymentReference}
        description={`Transaction receipt recorded on ${formatDate(payment.paidAt || payment.createdAt)}`}
        badge={<StatusBadge status={payment.status} />}
      >
        {unallocatedPaise > BigInt(0) && openInvoices.length > 0 && (
          <button
            onClick={() => setShowAllocateModal(true)}
            className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Allocate to Invoice
          </button>
        )}
      </PageHeader>

      {message && (
        <div
          className={`mb-6 p-3 rounded-[8px] text-[12px] font-medium border ${
            message.type === "success"
              ? "bg-[#EDF7F2] text-[#16865B] border-[#C7E8D8]"
              : "bg-[#FDEDED] text-[#D14343] border-[#F8C6C6]"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1">
            <span>Customer</span>
            <Building className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="font-semibold text-[#172033] text-[14px] truncate">
            {payment.customer?.fullName}
          </p>
          <p className="text-[12px] text-[#64748B] truncate mt-0.5">
            {payment.customer?.companyName || "Individual Customer"}
          </p>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1">
            <span>Payment Method</span>
            <CreditCard className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="font-semibold text-[#172033] text-[14px] font-mono uppercase">
            {payment.paymentMethod}
          </p>
          <p className="text-[12px] text-[#64748B] mt-0.5">Currency: {payment.currency}</p>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1">
            <span>Total Collected</span>
            <CreditCard className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="font-semibold text-[#16865B] text-[18px] font-mono">
            <MoneyDisplay amountMinor={payment.amountMinor} currency={payment.currency} />
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">Cleared receipt</p>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[12px] font-medium mb-1">
            <span>Unallocated Balance</span>
            <CreditCard className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="font-semibold text-[#C58A24] text-[18px] font-mono">
            <MoneyDisplay amountMinor={payment.unallocatedAmountMinor} currency={payment.currency} />
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            {unallocatedPaise === BigInt(0) ? "Fully Allocated" : "Credit Available"}
          </p>
        </div>
      </div>

      {/* Allocations Table */}
      <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden mb-6">
        <div className="p-4 border-b border-[#E5EAF1]">
          <h2 className="text-[14px] font-semibold text-[#172033]">Invoice Allocations</h2>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            Invoices credited against this payment receipt
          </p>
        </div>

        {payment.allocations && payment.allocations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Allocated Date</th>
                  <th className="py-2.5 px-4 text-right">Allocated Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {payment.allocations.map((a: any) => (
                  <tr key={a.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-mono font-medium text-[#172033]">
                      <Link
                        href={`/admin/invoices/${a.invoiceId}`}
                        className="text-[#315CF5] hover:underline"
                      >
                        {a.invoice?.invoiceNumber || a.invoiceId}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-[12px] text-[#64748B]">
                      {formatDate(a.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-[#16865B]">
                      <MoneyDisplay amountMinor={a.amountMinor} currency={payment.currency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-[#94A3B8] text-[12px]">
            No invoices have been matched against this payment yet.
          </div>
        )}
      </div>

      {/* Allocate Modal */}
      {showAllocateModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !allocating) setShowAllocateModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs"
        >
          <div className="bg-white rounded-[12px] max-w-md w-full p-6 shadow-dropdown border border-[#E5EAF1] animate-fade-in">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E5EAF1]">
              <h3 className="text-[16px] font-semibold text-[#172033]">Allocate Payment</h3>
              <button
                onClick={() => setShowAllocateModal(false)}
                className="text-[#94A3B8] hover:text-[#172033] p-1 rounded-[6px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAllocate} className="mt-4 space-y-3.5 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">
                  Target Open Invoice <span className="text-[#D14343]">*</span>
                </label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    const inv = openInvoices.find((i) => i.id === e.target.value);
                    if (inv) {
                      const balanceRupees = Number(inv.balanceDueMinor) / 100;
                      const unallocRupees = Number(unallocatedPaise) / 100;
                      setAllocateAmountRupees(Math.min(balanceRupees, unallocRupees).toString());
                    }
                  }}
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
                >
                  <option value="">Select an invoice...</option>
                  {openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} (Balance: ₹{(Number(inv.balanceDueMinor) / 100).toLocaleString("en-IN")})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">
                  Amount to Allocate (INR ₹) <span className="text-[#D14343]">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={allocateAmountRupees}
                  onChange={(e) => setAllocateAmountRupees(e.target.value)}
                  className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
                />
                <span className="text-[11px] text-[#64748B] mt-1 block">
                  Available credit: ₹{(Number(unallocatedPaise) / 100).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#E5EAF1]">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  disabled={allocating}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocating}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] rounded-[8px] shadow-xs"
                >
                  {allocating ? "Allocating..." : "Confirm Allocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
