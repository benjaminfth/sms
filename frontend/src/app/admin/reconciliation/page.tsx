"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { ReconciliationRecordDTO, PaymentStatus, PaymentMethod } from "@sms/shared";
import {
  Scale,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Receipt,
  Layers,
  Calendar,
  Building,
  Check,
  AlertCircle,
  X,
} from "lucide-react";

export default function ReconciliationPage() {
  const [records, setRecords] = useState<ReconciliationRecordDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "unmatched">("unmatched");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  // Allocation modal
  const [activePayment, setActivePayment] = useState<ReconciliationRecordDTO | null>(null);
  const [openInvoices, setOpenInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [allocateAmountRupees, setAllocateAmountRupees] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params: any = { pageSize: 50 };
      if (search.trim()) params.search = search.trim();
      if (tab === "unmatched") params.onlyUnmatched = true;
      if (methodFilter !== "all") params.paymentMethod = methodFilter;

      const res = await api.get<ReconciliationRecordDTO[]>("/reconciliation", params);
      if (res.success && res.data) {
        setRecords(res.data);
      }
    } catch (err) {
      console.error("Failed to load reconciliation report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [tab, methodFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  const openAllocationModal = async (payment: ReconciliationRecordDTO) => {
    setActivePayment(payment);
    setMessage(null);
    try {
      const res = await api.get<any[]>("/portal/invoices", { customerId: payment.customerId });
      if (res.success && res.data) {
        const open = res.data.filter(
          (inv: any) =>
            inv.status !== "PAID" &&
            inv.status !== "VOID" &&
            inv.status !== "CANCELLED" &&
            BigInt(inv.balanceDueMinor || 0) > BigInt(0)
        );
        setOpenInvoices(open);
        if (open.length > 0) {
          setSelectedInvoiceId(open[0].id);
          const unalloc = Number(payment.unallocatedAmountMinor) / 100;
          const due = Number(open[0].balanceDueMinor || 0) / 100;
          setAllocateAmountRupees(String(Math.min(unalloc, due)));
        }
      }
    } catch {
      setOpenInvoices([]);
    }
  };

  const submitAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayment || !selectedInvoiceId) return;

    const amt = parseFloat(allocateAmountRupees);
    if (isNaN(amt) || amt <= 0) {
      setMessage({ type: "error", text: "Please enter a valid allocation amount" });
      return;
    }

    setAllocating(true);
    try {
      const res = await api.post(`/reconciliation/${activePayment.id}/allocate`, {
        invoiceId: selectedInvoiceId,
        allocatedAmountMinor: String(Math.round(amt * 100)),
      });

      if (res.success) {
        setMessage({ type: "success", text: "Payment allocated and invoice balance updated!" });
        setActivePayment(null);
        fetchRecords();
      } else {
        setMessage({ type: "error", text: res.error?.message || "Allocation failed" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setAllocating(false);
    }
  };

  // Summaries
  const totalUnallocatedMinor = records.reduce(
    (sum, r) => sum + BigInt(r.unallocatedAmountMinor || 0),
    BigInt(0)
  );
  const unmatchedCount = records.filter((r) => !r.isFullyAllocated).length;

  return (
    <DashboardShell>
      <PageHeader
        title="Payment Reconciliation Console"
        description="Audit unmatched payments, track unallocated deposits, and settle customer balances"
      />

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Unmatched Transactions
          </span>
          <div className="text-2xl font-bold text-amber-600 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
            {unmatchedCount}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Payments with unallocated balance
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Unallocated Funds Pool
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ₹{(Number(totalUnallocatedMinor) / 100).toLocaleString("en-IN")}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Available for invoice settlement
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Reconciliation Health
          </span>
          <div className="text-2xl font-bold text-emerald-600 flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-500" />
            Active
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Transactional integrity verified
          </span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setTab("unmatched")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              tab === "unmatched"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Unmatched Only
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              tab === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Transactions
          </button>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </form>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Methods</option>
            <option value={PaymentMethod.UPI}>UPI</option>
            <option value={PaymentMethod.CARD}>Card</option>
            <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
            <option value={PaymentMethod.CASH}>Cash</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading reconciliation ledger...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">All payments fully reconciled</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no unmatched payments requiring allocation at this time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Payment Reference</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Allocated</th>
                  <th className="py-3 px-4">Unallocated</th>
                  <th className="py-3 px-4">Reconciliation Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {records.map((r) => {
                  const total = (Number(r.amountMinor) / 100).toLocaleString("en-IN");
                  const allocated = (Number(r.allocatedAmountMinor) / 100).toLocaleString("en-IN");
                  const unallocated = (Number(r.unallocatedAmountMinor) / 100).toLocaleString("en-IN");

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900">{r.paymentReference}</span>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {r.paymentMethod} • {new Date(r.paidAt).toLocaleDateString("en-IN")}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{r.customerName}</div>
                        <div className="text-[11px] text-slate-400">{r.customerEmail}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">₹{total}</td>
                      <td className="py-3 px-4 font-mono text-emerald-600">₹{allocated}</td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-600">
                        {BigInt(r.unallocatedAmountMinor) > BigInt(0) ? `₹${unallocated}` : "₹0"}
                      </td>
                      <td className="py-3 px-4">
                        {r.isFullyAllocated ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Fully Allocated
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Unmatched (₹{unallocated})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {!r.isFullyAllocated && r.status === PaymentStatus.COMPLETED && (
                          <button
                            onClick={() => openAllocationModal(r)}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-brand-600 text-white hover:bg-brand-700 transition"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Allocate
                          </button>
                        )}
                        <Link
                          href={`/admin/payments/${r.id}`}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allocation Modal */}
      {activePayment && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActivePayment(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 mb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-0.5">
                  Reconcile Payment: {activePayment.paymentReference}
                </h3>
                <p className="text-xs text-slate-500">
                  Allocate unallocated funds (₹
                  {(Number(activePayment.unallocatedAmountMinor) / 100).toLocaleString("en-IN")}) to an open invoice for{" "}
                  <strong>{activePayment.customerName}</strong>.
                </p>
              </div>
              <button
                onClick={() => setActivePayment(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {openInvoices.length === 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-xs">
                  No open invoices with balance due found for this customer.
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setActivePayment(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submitAllocation} className="space-y-4">
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
                        const unalloc = Number(activePayment.unallocatedAmountMinor) / 100;
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
                    onClick={() => setActivePayment(null)}
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
