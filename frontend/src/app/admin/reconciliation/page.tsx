"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  RefreshCw,
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

  const fetchRecords = useCallback(async () => {
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
  }, [search, tab, methodFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

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
        setMessage({ type: "success", text: "Payment successfully reconciled and allocated." });
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

  const totalUnallocatedMinor = records.reduce(
    (sum, r) => sum + BigInt(r.unallocatedAmountMinor || 0),
    BigInt(0)
  );
  const unmatchedCount = records.filter((r) => !r.isFullyAllocated).length;

  return (
    <DashboardShell>
      <PageHeader
        title="Payment Reconciliation"
        description="Audit unmatched payments, track unallocated deposits, and settle customer balances"
        actions={
          <button
            onClick={() => fetchRecords()}
            className="inline-flex items-center px-3 py-1.5 rounded-btn border border-border bg-surface-card hover:bg-surface-canvas text-[13px] font-medium text-text-primary transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {message && (
        <div
          className={`mb-5 p-3 rounded-btn border text-[13px] font-medium flex items-center justify-between ${
            message.type === "success"
              ? "bg-status-success/10 border-status-success/20 text-status-success"
              : "bg-status-danger/10 border-status-danger/20 text-status-danger"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-card p-4 rounded-card border border-border shadow-xs">
          <div className="text-[12px] font-medium text-text-secondary">Unmatched Payments</div>
          <div className="text-[24px] font-semibold text-text-primary tracking-tight mt-1">
            {unmatchedCount}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Require customer invoice allocation</div>
        </div>

        <div className="bg-surface-card p-4 rounded-card border border-border shadow-xs">
          <div className="text-[12px] font-medium text-text-secondary">Unallocated Float</div>
          <div className="text-[24px] font-semibold text-status-warning tracking-tight mt-1 font-mono">
            ₹{(Number(totalUnallocatedMinor) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Unsettled credit awaiting matching</div>
        </div>

        <div className="bg-surface-card p-4 rounded-card border border-border shadow-xs">
          <div className="text-[12px] font-medium text-text-secondary">Reconciled Volume</div>
          <div className="text-[24px] font-semibold text-text-primary tracking-tight mt-1">
            {records.filter((r) => r.isFullyAllocated).length} / {records.length}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Fully matched transactions in view</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface-card p-4 rounded-card border border-border shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <button
              onClick={() => setTab("unmatched")}
              className={`px-3 py-1.5 rounded-btn text-[12px] font-medium transition-colors ${
                tab === "unmatched"
                  ? "bg-primary-accent text-white"
                  : "bg-surface-canvas text-text-secondary hover:text-text-primary border border-border"
              }`}
            >
              Unmatched Only ({unmatchedCount})
            </button>
            <button
              onClick={() => setTab("all")}
              className={`px-3 py-1.5 rounded-btn text-[12px] font-medium transition-colors ${
                tab === "all"
                  ? "bg-primary-accent text-white"
                  : "bg-surface-canvas text-text-secondary hover:text-text-primary border border-border"
              }`}
            >
              All Payments ({records.length})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search ref or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-surface-card border border-border rounded-input text-[13px] text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
              />
            </form>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-1.5 bg-surface-card border border-border rounded-input text-[12px] text-text-primary focus:outline-hidden focus:border-primary-accent"
            >
              <option value="all">All Methods</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NET_BANKING">Net Banking</option>
              <option value="CASH">Cash</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-surface-card rounded-card border border-border shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[13px] text-text-secondary">
            Loading reconciliation records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-[13px] text-text-secondary">
            No payments found matching the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-canvas text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  <th className="py-2.5 px-4">Payment Ref</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                  <th className="py-2.5 px-4 text-right">Allocated</th>
                  <th className="py-2.5 px-4 text-right">Unallocated</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r) => {
                  const total = (Number(r.amountMinor) / 100).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  });
                  const allocated = (Number(r.allocatedAmountMinor) / 100).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  });
                  const unallocated = (Number(r.unallocatedAmountMinor) / 100).toLocaleString(
                    "en-IN",
                    { minimumFractionDigits: 2 }
                  );

                  return (
                    <tr key={r.id} className="hover:bg-surface-canvas/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-medium text-text-primary text-[12px]">
                          {r.paymentReference}
                        </span>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          {r.paymentMethod.replace("_", " ")} • {new Date(r.paidAt).toLocaleDateString("en-IN")}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-text-primary">{r.customerName}</div>
                        <div className="text-[11px] text-text-muted">{r.customerEmail}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-text-primary">
                        ₹{total}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-status-success">
                        ₹{allocated}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-status-warning">
                        {BigInt(r.unallocatedAmountMinor) > BigInt(0) ? `₹${unallocated}` : "₹0.00"}
                      </td>
                      <td className="py-3 px-4">
                        {r.isFullyAllocated ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-badge text-[11px] font-medium bg-status-success/10 text-status-success border border-status-success/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Fully Reconciled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-badge text-[11px] font-medium bg-status-warning/10 text-status-warning border border-status-warning/20">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Unallocated
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {!r.isFullyAllocated && r.status === PaymentStatus.COMPLETED && (
                          <button
                            onClick={() => openAllocationModal(r)}
                            className="inline-flex items-center px-2.5 py-1 text-[12px] font-medium rounded-btn bg-primary-accent text-white hover:bg-primary-hover transition-colors shadow-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Allocate
                          </button>
                        )}
                        <Link
                          href={`/admin/payments/${r.id}`}
                          className="inline-flex items-center px-2.5 py-1 text-[12px] font-medium rounded-btn border border-border bg-surface-card hover:bg-surface-canvas text-text-primary transition-colors"
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
          <div className="bg-surface-card rounded-dialog max-w-md w-full p-6 shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 mb-3 border-b border-border">
              <div>
                <h3 className="text-[15px] font-semibold text-text-primary mb-0.5">
                  Reconcile Payment: {activePayment.paymentReference}
                </h3>
                <p className="text-[12px] text-text-secondary">
                  Allocate float (₹
                  {(Number(activePayment.unallocatedAmountMinor) / 100).toLocaleString("en-IN")}) to an open invoice for{" "}
                  <strong className="text-text-primary">{activePayment.customerName}</strong>.
                </p>
              </div>
              <button
                onClick={() => setActivePayment(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-btn hover:bg-surface-canvas transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {openInvoices.length === 0 ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-status-warning/10 text-status-warning border border-status-warning/20 rounded-btn text-[12px]">
                  No open invoices with balance due found for this customer.
                </div>
                <div className="pt-2 border-t border-border flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setActivePayment(null)}
                    className="px-4 py-2 text-[12px] font-medium rounded-btn border border-border bg-surface-card hover:bg-surface-canvas text-text-primary transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submitAllocation} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-text-primary mb-1">
                    Select Target Invoice
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
                    className="w-full text-[13px] border border-border rounded-input px-3 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
                  >
                    {openInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        #{inv.invoiceNumber} — Balance Due: ₹{(Number(inv.balanceDueMinor) / 100).toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-text-primary mb-1">
                    Amount to Allocate (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-text-muted">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={allocateAmountRupees}
                      onChange={(e) => setAllocateAmountRupees(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-[13px] font-mono font-medium border border-border rounded-input bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setActivePayment(null)}
                    className="px-3 py-2 text-[12px] font-medium text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={allocating}
                    className="px-4 py-2 text-[12px] font-medium rounded-btn bg-primary-accent text-white hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-xs"
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
