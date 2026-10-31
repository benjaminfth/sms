"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { DiscountDTO, DiscountType } from "@sms/shared";
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Tag,
  Check,
  CheckCircle2,
  XCircle,
  Users,
  Receipt,
  Calendar,
} from "lucide-react";

export default function EditDiscountPage() {
  const params = useParams();
  const discountId = params.id as string;

  const [discount, setDiscount] = useState<DiscountDTO | null>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    isActive: true,
    maxRedemptions: "",
    endDate: "",
  });

  useEffect(() => {
    async function loadDiscount() {
      setLoading(true);
      try {
        const [discRes, redRes] = await Promise.all([
          api.get<DiscountDTO>(`/discounts/${discountId}`),
          api.get<any>(`/discounts/${discountId}/redemptions`),
        ]);

        if (discRes.success && discRes.data) {
          const d = discRes.data;
          setDiscount(d);
          setFormData({
            name: d.name,
            isActive: d.isActive,
            maxRedemptions: d.maxRedemptions ? String(d.maxRedemptions) : "",
            endDate: d.endDate ? d.endDate.split("T")[0] || "" : "",
          });
        }

        if (redRes.success && redRes.data) {
          setRedemptions(redRes.data.applications || []);
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to load discount" });
      } finally {
        setLoading(false);
      }
    }

    loadDiscount();
  }, [discountId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await api.patch(`/discounts/${discountId}`, {
        name: formData.name.trim(),
        isActive: formData.isActive,
        maxRedemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions, 10) : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      });

      if (res.success) {
        setMessage({ type: "success", text: "Discount updated successfully" });
      } else {
        setMessage({ type: "error", text: res.error?.message || "Failed to update discount" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
          <p className="text-xs text-slate-400 mt-2 font-medium">Loading discount details...</p>
        </div>
      </DashboardShell>
    );
  }

  const isPct = discount?.discountType === DiscountType.PERCENTAGE;
  const displayVal = discount
    ? isPct
      ? `${(Number(discount.valueMinorOrBasisPoints) / 100).toFixed(1)}%`
      : `₹${(Number(discount.valueMinorOrBasisPoints) / 100).toLocaleString("en-IN")}`
    : "";

  return (
    <DashboardShell>
      <PageHeader
        title={`Discount: ${discount?.code}`}
        description="View redemption history and adjust promo rules"
      >
        <Link
          href="/admin/discounts"
          className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Discounts
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Quick Snapshot & Edit Form */}
        <div className="space-y-6">
          {/* Quick Snapshot Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Discount Value
              </span>
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Tag className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{displayVal}</div>
            <div className="text-xs text-slate-500 mt-1 capitalize font-medium">
              {discount?.discountType.toLowerCase().replace("_", " ")}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Total Redemptions:</span>
              <span className="font-bold text-slate-900 font-mono">
                {discount?.currentRedemptions} / {discount?.maxRedemptions || "Unlimited"}
              </span>
            </div>
          </div>

          {/* Edit Form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
              Edit Parameters
            </h3>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Redemptions</label>
                <input
                  type="number"
                  placeholder="Unlimited if empty"
                  value={formData.maxRedemptions}
                  onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (Expiry)</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="discEditActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="discEditActive" className="text-xs font-medium text-slate-700">
                  Active
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Redemptions History */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Redemption Audit Trail</h3>
                <p className="text-xs text-slate-500">
                  Chronological records of invoice and quotation deductions
                </p>
              </div>
              <span className="text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                {redemptions.length} events
              </span>
            </div>

            {redemptions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No customer has redeemed this discount code yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Invoice / Quotation</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Deducted Amount</th>
                      <th className="py-2.5 px-3">Redeemed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {redemptions.map((red) => (
                      <tr key={red.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-brand-600">
                          {red.invoice?.invoiceNumber || red.quotation?.quotationNumber || "Direct"}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900">
                            {red.invoice?.customer?.fullName || "Customer"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {red.invoice?.customer?.email}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-emerald-600">
                          -₹{(Number(red.amountDeductedMinor) / 100).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(red.appliedAt).toLocaleString("en-IN")}
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
    </DashboardShell>
  );
}
