"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { DiscountType, ProductDTO } from "@sms/shared";
import { ArrowLeft, Save, AlertCircle, Tag, CheckSquare, Square } from "lucide-react";

export default function CreateDiscountPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    discountType: DiscountType.PERCENTAGE,
    percentValue: "20",
    fixedAmountRupees: "500",
    startDate: "",
    endDate: "",
    maxRedemptions: "",
    isActive: true,
  });

  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await api.get<ProductDTO[]>("/products", { pageSize: 100 });
        if (res.success && res.data) {
          setProducts(res.data);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      }
    }
    loadProducts();
  }, []);

  const toggleProduct = (pId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.code.trim() || !formData.name.trim()) {
      setError("Please provide a promo code and discount title");
      return;
    }

    let valueMinorOrBasisPoints: string;
    if (formData.discountType === DiscountType.PERCENTAGE) {
      const pct = parseFloat(formData.percentValue);
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        setError("Percentage discount must be between 0.1% and 100%");
        return;
      }
      valueMinorOrBasisPoints = String(Math.round(pct * 100)); // basis points
    } else {
      const rupees = parseFloat(formData.fixedAmountRupees);
      if (isNaN(rupees) || rupees <= 0) {
        setError("Fixed discount must be greater than ₹0");
        return;
      }
      valueMinorOrBasisPoints = String(Math.round(rupees * 100)); // paise
    }

    setSaving(true);
    try {
      const res = await api.post("/discounts", {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        discountType: formData.discountType,
        valueMinorOrBasisPoints,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        maxRedemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions, 10) : null,
        isActive: formData.isActive,
        productIds: selectedProductIds.length > 0 ? selectedProductIds : undefined,
      });

      if (res.success) {
        router.push("/admin/discounts");
      } else {
        setError(res.error?.message || "Failed to create discount");
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
        title="Create New Discount Rule"
        description="Set up promotional codes, percentage discounts, or fixed deductions"
      >
        <Link
          href="/admin/discounts"
          className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Discounts
        </Link>
      </PageHeader>

      <div className="max-w-3xl bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discount Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. LAUNCH20, EARLYBIRD, BLACKFRIDAY"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs font-mono font-bold uppercase border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discount Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Launch Special 20% Off"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Discount Type & Value</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <select
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({ ...formData, discountType: e.target.value as DiscountType })
                  }
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value={DiscountType.PERCENTAGE}>Percentage (%)</option>
                  <option value={DiscountType.FIXED_AMOUNT}>Fixed Amount (₹)</option>
                </select>
              </div>

              <div>
                {formData.discountType === DiscountType.PERCENTAGE ? (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      max="100"
                      value={formData.percentValue}
                      onChange={(e) => setFormData({ ...formData, percentValue: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500"
                      placeholder="e.g. 20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      % OFF
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={formData.fixedAmountRupees}
                      onChange={(e) =>
                        setFormData({ ...formData, fixedAmountRupees: e.target.value })
                      }
                      className="w-full text-xs pl-7 pr-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
                      placeholder="e.g. 500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Redemptions</label>
              <input
                type="number"
                placeholder="Optional (e.g. 100)"
                value={formData.maxRedemptions}
                onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* Product Eligibility */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Eligible Products (Optional)
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedProductIds.length === 0
                  ? "Applies to all products"
                  : `${selectedProductIds.length} products selected`}
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
              {products.map((prod) => {
                const selected = selectedProductIds.includes(prod.id);
                return (
                  <div
                    key={prod.id}
                    onClick={() => toggleProduct(prod.id)}
                    className={`flex items-center space-x-2 px-2.5 py-1.5 rounded cursor-pointer text-xs transition ${
                      selected ? "bg-brand-50 text-brand-900 font-medium" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {selected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span>{prod.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">({prod.sku})</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="discActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="discActive" className="text-xs font-medium text-slate-700">
              Active promotional discount
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <Link
              href="/admin/discounts"
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
              {saving ? "Saving Discount..." : "Save Discount"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
