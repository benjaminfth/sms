"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { PaymentStatus } from "@sms/shared";
import {
  ArrowLeft,
  CreditCard,
  Building,
  Calendar,
  CheckCircle2,
  XCircle,
  Receipt,
  Layers,
  Plus,
  AlertCircle,
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

  const loadPayment = async () => {
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
            if (open.length > 0) {
              setSelectedInvoiceId(open[0].id);
              const unallocated = Number(res.data.unallocatedAmountMinor || 0) / 100;
              const due = Number(open[0].balanceDueMinor || 0) / 100;
              setAllocateAmountRupees(String(Math.min(unallocated, due)));
            }
          }
        }
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load payment" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayment();
  }, [paymentId]);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) return;

    const amt = parseFloat(allocateAmountRupees);
    if (isNaN(amt) || amt <= 0) {
      setMessage({ type: "error", text: "Please enter a valid allocation amount" });
      return;
    }

    setAllocating(true);
    setMessage(null);

    try {
      const res = await api.post(`/payment-allocations/${paymentId}/allocations`, {
        invoiceId: selectedInvoiceId,
        allocatedAmountMinor: String(Math.round(amt * 100)),
      });

      if (res.success) {
        setMessage({ type: "success", text: "Payment allocated successfully!" });
        setShowAllocateModal(false);
        loadPayment();
      } else {
        setMessage({ type: "error", text: res.error?.message || "Failed to allocate payment" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Allocation failed" });
    } finally {
      setAllocating(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
          <p className="text-xs text-slate-400 mt-2 font-medium">Loading transaction details...</p>
        </div>
      </DashboardShell>
    );
  }

  const unallocatedPaise = BigInt(payment?.unallocatedAmountMinor || 0);
  const totalAmountPaise = BigInt(payment?.amountMinor || 0);
  const allocatedPaise = totalAmountPaise > unallocatedPaise ? totalAmountPaise - unallocatedPaise : BigInt(0);

  return (
    <DashboardShell>
      <PageHeader
        title={`Payment: ${payment?.paymentReference}`}
        description="Transaction receipt, customer association, and settlement allocations"
      >
        <Link
          href="/admin/payments"
          className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Payments
        </Link>
      </PageHeader>

      {message && (
        <div
          className={`mb-6 p-3.5 rounded-lg border text-xs flex items-center ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <Check className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mr-2 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Top 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total Paid
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ₹{(Number(totalAmountPaise) / 100).toLocaleString("en-IN")}
          </div>
          <span className="text-xs text-slate-500 mt-1 inline-flex items-center">
            Method: <strong className="ml-1 uppercase">{payment?.paymentMethod}</strong>
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Allocated to Invoices
          </span>
          <div className="text-2xl font-bold text-emerald-600 font-mono">
            ₹{(Number(allocatedPaise) / 100).toLocaleString("en-IN")}
          </div>
          <span className="text-xs text-emerald-600 font-medium mt-1 block">
            {payment?.allocations?.length || 0} invoice allocations
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Unallocated Balance
          </span>
          <div className="text-2xl font-bold text-amber-600 font-mono">
            ₹{(Number(unallocatedPaise) / 100).toLocaleString("en-IN")}
          </div>
          {unallocatedPaise > BigInt(0) && payment?.status === PaymentStatus.COMPLETED ? (
            <button
              onClick={() => setShowAllocateModal(true)}
              className="mt-2 inline-flex items-center text-xs font-semibold text-brand-600 hover:text-brand-700 underline"
            >
              Allocate to Open Invoice →
            </button>
          ) : (
            <span className="text-xs text-slate-400 mt-1 block">Fully reconciled</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Metadata */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Transaction Details
          </h3>

          <div className="text-xs space-y-3">
            <div>
              <span className="text-slate-400 block font-medium">Customer</span>
              <div className="font-semibold text-slate-900 mt-0.5">{payment?.customer?.fullName}</div>
              {payment?.customer?.companyName && (
                <div className="text-slate-500">{payment?.customer?.companyName}</div>
              )}
              <div className="text-slate-400">{payment?.customer?.email}</div>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Status</span>
              <div className="mt-1">
                {payment?.status === PaymentStatus.COMPLETED ? (
                  <span className="inline-flex items-center text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Completed
                  </span>
                ) : (
                  <span className="inline-flex items-center text-amber-600 font-semibold">
                    {payment?.status}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Date & Timestamp</span>
              <div className="text-slate-700 font-mono mt-0.5">
                {new Date(payment?.paidAt).toLocaleString("en-IN")}
              </div>
            </div>

            {payment?.notes && (
              <div>
                <span className="text-slate-400 block font-medium">Notes</span>
                <div className="text-slate-600 p-2.5 bg-slate-50 rounded-lg border border-slate-100 mt-0.5 whitespace-pre-wrap">
                  {payment.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Allocations Ledger */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Payment Allocations</h3>
                <p className="text-xs text-slate-500">Invoices settled by this transaction</p>
              </div>
              {unallocatedPaise > BigInt(0) && payment?.status === PaymentStatus.COMPLETED && (
                <button
                  onClick={() => setShowAllocateModal(true)}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Allocate
                </button>
              )}
            </div>

            {payment?.allocations?.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">This payment has not yet been allocated to any invoice.</p>
                {unallocatedPaise > BigInt(0) && (
                  <button
                    onClick={() => setShowAllocateModal(true)}
                    className="mt-3 text-xs font-semibold text-brand-600 hover:underline"
                  >
                    Click here to allocate to an open invoice
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Invoice Number</th>
                      <th className="py-2.5 px-3">Invoice Total</th>
                      <th className="py-2.5 px-3">Allocated Amount</th>
                      <th className="py-2.5 px-3">Remaining Due</th>
                      <th className="py-2.5 px-3">Allocated At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {payment?.allocations?.map((alloc: any) => (
                      <tr key={alloc.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-brand-600">
                          {alloc.invoice?.invoiceNumber || "Invoice"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-900">
                          ₹{(Number(alloc.invoice?.totalAmountMinor || 0) / 100).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">
                          ₹{(Number(alloc.allocatedAmountMinor) / 100).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-600">
                          ₹{(Number(alloc.invoice?.balanceDueMinor || 0) / 100).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(alloc.createdAt).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Allocation Modal */}
      {showAllocateModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAllocateModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 mb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-0.5">Allocate Payment</h3>
                <p className="text-xs text-slate-500">
                  Allocate funds from unallocated balance (₹{(Number(unallocatedPaise) / 100).toLocaleString("en-IN")}) to an open invoice.
                </p>
              </div>
              <button
                onClick={() => setShowAllocateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {openInvoices.length === 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-xs">
                  No open or unpaid invoices found for this customer.
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAllocateModal(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAllocate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Open Invoice
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => {
                      setSelectedInvoiceId(e.target.value);
                      const inv = openInvoices.find((i) => i.id === e.target.value);
                      if (inv) {
                        const unalloc = Number(unallocatedPaise) / 100;
                        const due = Number(inv.balanceDueMinor || 0) / 100;
                        setAllocateAmountRupees(String(Math.min(unalloc, due)));
                      }
                    }}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
                  >
                    {openInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        #{inv.invoiceNumber} — Balance Due: ₹{(Number(inv.balanceDueMinor) / 100).toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount to Allocate (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={allocateAmountRupees}
                      onChange={(e) => setAllocateAmountRupees(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAllocateModal(false)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={allocating}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {allocating ? "Applying..." : "Confirm Allocation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
