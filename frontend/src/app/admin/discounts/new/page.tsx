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
    scope: "SUBSCRIPTION",
    minQuantity: "",
    minOrderAmountRupees: "",
    maxDiscountAmountRupees: "",
    recurringCycleCount: "",
    maxRedemptionsPerCustomer: "",
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
        scope: formData.scope,
        minQuantity: formData.minQuantity ? parseInt(formData.minQuantity, 10) : null,
        minOrderAmountMinor: formData.minOrderAmountRupees
          ? String(Math.round(parseFloat(formData.minOrderAmountRupees) * 100))
          : null,
        maxDiscountAmountMinor: formData.maxDiscountAmountRupees
          ? String(Math.round(parseFloat(formData.maxDiscountAmountRupees) * 100))
          : null,
        recurringCycleCount: formData.recurringCycleCount
          ? parseInt(formData.recurringCycleCount, 10)
          : null,
        maxRedemptionsPerCustomer: formData.maxRedemptionsPerCustomer
          ? parseInt(formData.maxRedemptionsPerCustomer, 10)
          : null,
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
        title="Create Discount Rule"
        description="Configure promotional codes, percentage discounts, or fixed deductions"
        actions={
          <Link
            href="/admin/discounts"
            className="inline-flex items-center px-3 py-1.5 border border-border rounded-btn text-[13px] font-medium text-text-primary bg-surface-card hover:bg-surface-canvas transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Discounts
          </Link>
        }
      />

      <div className="max-w-3xl bg-surface-card rounded-card border border-border p-6 shadow-xs">
        {error && (
          <div className="mb-5 p-3 rounded-btn bg-status-danger/10 border border-status-danger/20 text-[12px] text-status-danger font-medium flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-[14px] font-semibold text-text-primary mb-3 pb-2 border-b border-border">
              Basic Rule Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Discount Code *
                </label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. LAUNCH20, BLACKFRIDAY"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="w-full pl-9 pr-3.5 py-2 text-[13px] font-mono font-medium uppercase border border-border rounded-input bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Discount Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Early Adopter 20% Off"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-[13px] border border-border rounded-input px-3.5 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
                />
              </div>
            </div>
          </div>

          {/* Value and Mechanics */}
          <div>
            <h3 className="text-[14px] font-semibold text-text-primary mb-3 pb-2 border-b border-border">
              Deduction Mechanics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Discount Type
                </label>
                <select
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({ ...formData, discountType: e.target.value as DiscountType })
                  }
                  className="w-full text-[13px] border border-border rounded-input px-3.5 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
                >
                  <option value={DiscountType.PERCENTAGE}>Percentage (%) Deduction</option>
                  <option value={DiscountType.FIXED_AMOUNT}>Fixed Amount (₹) Deduction</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  {formData.discountType === DiscountType.PERCENTAGE
                    ? "Percentage Value (%) *"
                    : "Fixed Amount (₹) *"}
                </label>
                {formData.discountType === DiscountType.PERCENTAGE ? (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="100"
                      required
                      value={formData.percentValue}
                      onChange={(e) => setFormData({ ...formData, percentValue: e.target.value })}
                      className="w-full text-[13px] font-mono border border-border rounded-input px-3.5 py-2 pr-8 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-text-muted">
                      %
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-text-muted">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={formData.fixedAmountRupees}
                      onChange={(e) => setFormData({ ...formData, fixedAmountRupees: e.target.value })}
                      className="w-full pl-7 pr-3.5 py-2 text-[13px] font-mono border border-border rounded-input bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full text-[13px] border border-border rounded-input px-3 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full text-[13px] border border-border rounded-input px-3 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Total Redemption Limit
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={formData.maxRedemptions}
                  onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                  className="w-full text-[13px] border border-border rounded-input px-3 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
                />
              </div>
            </div>
          </div>

          {/* Limits and Constraints */}
          <div>
            <h3 className="text-[14px] font-semibold text-text-primary mb-3 pb-2 border-b border-border">
              Eligibility & Limits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Minimum Order (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 2000"
                  value={formData.minOrderAmountRupees}
                  onChange={(e) => setFormData({ ...formData, minOrderAmountRupees: e.target.value })}
                  className="w-full text-[13px] border border-border rounded-input px-3 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Max Cap Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 1000"
                  value={formData.maxDiscountAmountRupees}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmountRupees: e.target.value })}
                  className="w-full text-[13px] border border-border rounded-input px-3 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Per-Customer Limit
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 1 per customer"
                  value={formData.maxRedemptionsPerCustomer}
                  onChange={(e) => setFormData({ ...formData, maxRedemptionsPerCustomer: e.target.value })}
                  className="w-full text-[13px] border border-border rounded-input px-3 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
                />
              </div>
            </div>

            {/* Product Eligibility */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] font-medium text-text-primary">
                  Product Specificity (Optional)
                </label>
                <span className="text-[11px] text-text-muted">
                  {selectedProductIds.length === 0
                    ? "Applies across all products"
                    : `${selectedProductIds.length} products restricted`}
                </span>
              </div>

              <div className="border border-border rounded-input p-2 max-h-36 overflow-y-auto space-y-1 bg-surface-canvas">
                {products.map((prod) => {
                  const selected = selectedProductIds.includes(prod.id);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => toggleProduct(prod.id)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-btn cursor-pointer text-[12px] transition-colors ${
                        selected
                          ? "bg-surface-card text-text-primary font-medium border border-primary-accent/40 shadow-xs"
                          : "hover:bg-surface-card/60 text-text-secondary"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {selected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-primary-accent shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        )}
                        <span>{prod.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-text-muted">({prod.sku})</span>
                    </div>
                  );
                })}
              </div>
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
                Active promotional code (immediately redeemable)
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end space-x-2">
            <Link
              href="/admin/discounts"
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
              {saving ? "Saving..." : "Create Discount Rule"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
