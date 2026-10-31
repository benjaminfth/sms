"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { PaymentMethod, PaymentStatus, CustomerDTO } from "@sms/shared";
import { ArrowLeft, Save, CreditCard, Building, Receipt } from "lucide-react";

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

  // When customer changes, fetch open invoices
  useEffect(() => {
    async function loadCustomerInvoices() {
      if (!formData.customerId) {
        setInvoices([]);
        return;
      }
      try {
        const res = await api.get<any[]>("/portal/invoices", { customerId: formData.customerId });
        if (res.success && res.data) {
          const open = res.data.filter(
            (inv: any) =>
              inv.status !== "PAID" &&
              inv.status !== "VOID" &&
              inv.status !== "CANCELLED" &&
              BigInt(inv.balanceDueMinor || 0) > BigInt(0)
          );
          setInvoices(open);
        }
      } catch (err) {
        console.error("Failed to load customer open invoices:", err);
      }
    }
    loadCustomerInvoices();
  }, [formData.customerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.amountRupees) {
      setError("Please select a customer and specify the payment amount.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const amountPaise = BigInt(Math.round(parseFloat(formData.amountRupees) * 100)).toString();

      const payload = {
        customerId: formData.customerId,
        invoiceId: formData.invoiceId || undefined,
        amountMinor: amountPaise,
        paymentMethod: formData.paymentMethod,
        status: formData.status,
        paymentReference: formData.paymentReference || `REC-${Date.now()}`,
        notes: formData.notes || undefined,
        internalNotes: formData.internalNotes || undefined,
        customerNotes: formData.customerNotes || undefined,
      };

      const res = await api.post<any>("/payments", payload);
      if (res.success && res.data) {
        router.push(`/admin/payments/${res.data.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to record payment transaction.");
    } finally {
      setSaving(false);
    }
  };

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
        title="Record Payment"
        description="Enter manual bank receipts, offline transfers or settled client payments."
      />

      {error && (
        <div className="bg-[#FDEDED] border border-[#F8C6C6] text-[#D14343] px-3.5 py-2.5 rounded-[8px] mb-6 text-[12px] font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs space-y-4">
          <h2 className="text-[14px] font-semibold text-[#172033] pb-3 border-b border-[#E5EAF1]">
            Transaction Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Customer Account <span className="text-[#D14343]">*</span>
              </label>
              <select
                required
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} {c.companyName ? `(${c.companyName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Allocate to Open Invoice (Optional)
              </label>
              <select
                value={formData.invoiceId}
                onChange={(e) => {
                  const invId = e.target.value;
                  setFormData((prev) => {
                    const inv = invoices.find((i) => i.id === invId);
                    return {
                      ...prev,
                      invoiceId: invId,
                      amountRupees: inv ? (Number(inv.balanceDueMinor) / 100).toString() : prev.amountRupees,
                    };
                  });
                }}
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              >
                <option value="">Leave unallocated (Credit balance)</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} (Due: ₹{(Number(inv.balanceDueMinor) / 100).toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Amount Received (INR ₹) <span className="text-[#D14343]">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 5000.00"
                value={formData.amountRupees}
                onChange={(e) => setFormData({ ...formData, amountRupees: e.target.value })}
                className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Payment Method <span className="text-[#D14343]">*</span>
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              >
                <option value={PaymentMethod.UPI}>UPI (GPay / PhonePe / QR)</option>
                <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value={PaymentMethod.CARD}>Corporate Credit / Debit Card</option>
                <option value={PaymentMethod.CASH}>Cash Receipt</option>
                <option value={PaymentMethod.OTHER}>Other Offline Channel</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                UTR / Reference Number
              </label>
              <input
                type="text"
                placeholder="Bank UTR or Gateway Ref"
                value={formData.paymentReference}
                onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as PaymentStatus })}
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              >
                <option value={PaymentStatus.COMPLETED}>Completed (Settled)</option>
                <option value={PaymentStatus.PENDING}>Pending Clearing</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#172033] mb-1">Receipt Notes</label>
            <input
              type="text"
              placeholder="e.g. Paid via ICICI Current Account"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2.5">
          <Link
            href="/admin/payments"
            className="px-4 py-2 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px] transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] rounded-[8px] shadow-xs transition disabled:opacity-50"
          >
            {saving ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
