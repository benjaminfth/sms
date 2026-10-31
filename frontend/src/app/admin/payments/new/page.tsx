"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { PaymentMethod, PaymentStatus, CustomerDTO } from "@sms/shared";
import { ArrowLeft, Save, AlertCircle, CreditCard, Building, Receipt } from "lucide-react";

export default function RecordPaymentPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    customerId: "",
    invoiceId: "",
    amountRupees: "",
    paymentMethod: PaymentMethod.UPI,
    status: PaymentStatus.COMPLETED,
    paymentReference: "",
    notes: "",
    internalNotes: "",
    customerNotes: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await api.get<CustomerDTO[]>("/customers", { pageSize: 100 });
        if (res.success && res.data) {
          const list = res.data;
          setCustomers(list);
          if (list.length > 0 && list[0]) {
            setFormData((prev) => ({ ...prev, customerId: list[0].id }));
          }
        }
      } catch (err) {
        console.error("Failed to load customers:", err);
      }
    }
    loadCustomers();
  }, []);

  // When customer changes, fetch their open invoices
  useEffect(() => {
    if (!formData.customerId) return;

    async function loadInvoices() {
      try {
        const res = await api.get<any[]>("/portal/invoices", { customerId: formData.customerId });
        if (res.success && res.data) {
          // Filter to open/partially paid
          const open = res.data.filter(
            (inv: any) =>
              inv.status !== "PAID" &&
              inv.status !== "VOID" &&
              inv.status !== "CANCELLED" &&
              BigInt(inv.balanceDueMinor || 0) > BigInt(0)
          );
          setInvoices(open);
        }
      } catch {
        setInvoices([]);
      }
    }

    loadInvoices();
  }, [formData.customerId]);

  const handleInvoiceSelect = (invId: string) => {
    setFormData((prev) => {
      const selected = invoices.find((inv) => inv.id === invId);
      const autoAmount = selected ? (Number(selected.balanceDueMinor) / 100).toFixed(2) : prev.amountRupees;
      return {
        ...prev,
        invoiceId: invId,
        amountRupees: autoAmount,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amt = parseFloat(formData.amountRupees);
    if (isNaN(amt) || amt <= 0) {
      setError("Please specify a valid payment amount greater than ₹0");
      return;
    }

    const amountMinor = String(Math.round(amt * 100));

    setSaving(true);
    try {
      const res = await api.post("/payments", {
        customerId: formData.customerId,
        amountMinor,
        paymentMethod: formData.paymentMethod,
        status: formData.status,
        paymentReference: formData.paymentReference.trim() || undefined,
        invoiceId: formData.invoiceId || undefined,
        internalNotes: formData.internalNotes.trim() || undefined,
        customerNotes: formData.customerNotes.trim() || undefined,
      });

      if (res.success) {
        router.push("/admin/payments");
      } else {
        setError(res.error?.message || "Failed to record payment");
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Record Received Payment"
        description="Capture manual offline payments (UPI, Bank Transfer, Cash, Card) and allocate to open invoices"
      >
        <Link
          href="/admin/payments"
          className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Payments
        </Link>
      </PageHeader>

      <div className="max-w-2xl bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Account <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value, invoiceId: "" })}
              className="w-full text-xs border border-slate-200 rounded-lg px-3.5 py-2.5 bg-white focus:ring-2 focus:ring-brand-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} {c.companyName ? `(${c.companyName})` : ""} — {c.email}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Invoice Allocation Selection */}
          {invoices.length > 0 && (
            <div className="p-3.5 bg-brand-50/50 rounded-lg border border-brand-100">
              <label className="block text-xs font-semibold text-brand-900 mb-1">
                Auto-Allocate to Open Invoice (Optional)
              </label>
              <select
                value={formData.invoiceId}
                onChange={(e) => handleInvoiceSelect(e.target.value)}
                className="w-full text-xs border border-brand-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Do not allocate immediately (leave unallocated)</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    Invoice #{inv.invoiceNumber} — Balance Due: ₹
                    {(Number(inv.balanceDueMinor) / 100).toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-brand-600 mt-1">
                Selecting an invoice will automatically settle or partially pay the invoice balance upon recording.
              </p>
            </div>
          )}

          {/* Amount and Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Received (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 2500.00"
                  value={formData.amountRupees}
                  onChange={(e) => setFormData({ ...formData, amountRupees: e.target.value })}
                  className="w-full pl-7 pr-3 py-2.5 text-xs font-mono font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })
                }
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-brand-500"
              >
                <option value={PaymentMethod.UPI}>UPI (GPay / PhonePe / QR)</option>
                <option value={PaymentMethod.BANK_TRANSFER}>Bank Wire / NEFT / RTGS</option>
                <option value={PaymentMethod.CARD}>Credit / Debit Card</option>
                <option value={PaymentMethod.CASH}>Cash Deposit</option>
                <option value={PaymentMethod.OTHER}>Other Offline</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Transaction Reference
              </label>
              <input
                type="text"
                placeholder="Optional (Auto-generated if empty)"
                value={formData.paymentReference}
                onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as PaymentStatus })
                }
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
              >
                <option value={PaymentStatus.COMPLETED}>Completed (Successful)</option>
                <option value={PaymentStatus.PENDING}>Pending Verification</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Internal Staff Note (Confidential)
                </label>
                <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-medium">
                  Internal only · Never shown to customer
                </span>
              </div>
              <textarea
                rows={2}
                placeholder="e.g. UTR # 42398492834, HDFC corporate account reconciliation"
                value={formData.internalNotes}
                onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Customer-Visible Note (Optional)
                </label>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium">
                  Visible on Customer Portal receipt
                </span>
              </div>
              <textarea
                rows={2}
                placeholder="e.g. Payment received through HDFC bank transfer for October subscription."
                value={formData.customerNotes}
                onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <Link
              href="/admin/payments"
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? "Recording..." : "Record Payment Entry"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
