"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { ArrowLeft, Landmark, Save, AlertCircle } from "lucide-react";

export default function CreateTaxPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    ratePercent: "18.00",
    rateBasisPoints: 1800,
    isActive: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePercentChange = (val: string) => {
    const num = parseFloat(val);
    const bps = isNaN(num) ? 0 : Math.round(num * 100);
    setFormData((prev) => ({
      ...prev,
      ratePercent: val,
      rateBasisPoints: bps,
    }));
  };

  const handleBpsChange = (bps: number) => {
    const pct = (bps / 100).toFixed(2);
    setFormData((prev) => ({
      ...prev,
      rateBasisPoints: bps,
      ratePercent: pct,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.code.trim()) {
      setError("Please fill in tax name and tax code");
      return;
    }

    if (formData.rateBasisPoints < 0 || formData.rateBasisPoints > 10000) {
      setError("Tax rate basis points must be between 0 and 10,000 (0% - 100%)");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/taxes", {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        rateBasisPoints: formData.rateBasisPoints,
        isActive: formData.isActive,
      });

      if (res.success) {
        router.push("/admin/taxes");
      } else {
        setError(res.error?.message || "Failed to create tax rule");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Create New Tax Rule"
        description="Define configurable tax rates and statutory GST rules for products and invoices"
      >
        <Link
          href="/admin/taxes"
          className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Taxes
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tax Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Goods & Services Tax (18%)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-xs border border-slate-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Descriptive title displayed on customer invoices and quotations.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tax Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. GST-18, CGST-9, SGST-9, IGST-18"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Unique statutory code used in financial breakdowns and tax reconciliation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rate Percentage (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.ratePercent}
                  onChange={(e) => handlePercentChange(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                  %
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rate in Basis Points (bps)
              </label>
              <input
                type="number"
                min="0"
                max="10000"
                value={formData.rateBasisPoints}
                onChange={(e) => handleBpsChange(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                1% = 100 bps (e.g. 18% = 1800 bps)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isActive" className="text-xs font-medium text-slate-700">
              Active tax rule (available for newly generated quotations and subscription invoices)
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <Link
              href="/admin/taxes"
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
              {saving ? "Saving Tax..." : "Save Tax Configuration"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
