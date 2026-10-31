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
        title="Create Tax Rate"
        description="Define statutory tax rates and GST calculation rules applied to products and invoices"
        actions={
          <Link
            href="/admin/taxes"
            className="inline-flex items-center px-3 py-1.5 border border-border rounded-btn text-[13px] font-medium text-text-primary bg-surface-card hover:bg-surface-canvas transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Taxes
          </Link>
        }
      />

      <div className="max-w-2xl bg-surface-card rounded-card border border-border p-6 shadow-xs">
        {error && (
          <div className="mb-5 p-3 rounded-btn bg-status-danger/10 border border-status-danger/20 text-[12px] text-status-danger font-medium flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-text-primary mb-1">
              Tax Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Goods & Services Tax (18%)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-[13px] border border-border rounded-input px-3.5 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Descriptive title displayed on customer invoices and quotations.
            </p>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-text-primary mb-1">
              Tax Code *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. GST-18, CGST-9, SGST-9, IGST-18"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full text-[13px] font-mono border border-border rounded-input px-3.5 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-text-primary mb-1">
                Tax Rate (%) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={formData.ratePercent}
                  onChange={(e) => handlePercentChange(e.target.value)}
                  className="w-full text-[13px] font-mono border border-border rounded-input px-3.5 py-2 pr-8 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-text-muted">
                  %
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-text-primary mb-1">
                Basis Points (bps)
              </label>
              <input
                type="number"
                min="0"
                max="10000"
                value={formData.rateBasisPoints}
                onChange={(e) => handleBpsChange(parseInt(e.target.value) || 0)}
                className="w-full text-[13px] font-mono border border-border rounded-input px-3.5 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
              />
              <p className="text-[11px] text-text-muted mt-1">
                1% = 100 bps (e.g. 1800 bps = 18.00%)
              </p>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-primary-accent border-border focus:ring-primary-accent"
              />
              <span className="text-[13px] font-medium text-text-primary">
                Active statutory rule (available to link with products)
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-border flex justify-end space-x-2">
            <Link
              href="/admin/taxes"
              className="px-4 py-2 text-[12px] font-medium text-text-secondary hover:text-text-primary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 text-[12px] font-medium rounded-btn text-white bg-primary-accent hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Saving..." : "Create Tax Rate"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
