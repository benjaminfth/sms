"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

export default function NewProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    productType: "SERVICE",
    baseSellingPriceMinor: "200000",
    costPriceMinor: "0",
    currency: "INR",
  });

  const [variants, setVariants] = useState<
    Array<{ sku: string; name: string; priceAdjustmentMinor: string }>
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addVariantRow = () => {
    setVariants([
      ...variants,
      {
        sku: `${formData.sku ? formData.sku + "-" : ""}VAR-${variants.length + 1}`,
        name: "",
        priceAdjustmentMinor: "50000",
      },
    ]);
  };

  const removeVariantRow = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        variants: variants.length > 0 ? variants : undefined,
      };

      const res = await api.post("/products", payload);
      if (res.success) {
        router.push("/admin/products");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Create New Product"
        description="Define a new catalog product, baseline selling price in paise, and surcharge variants"
      >
        <Link
          href="/admin/products"
          className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Products
        </Link>
      </PageHeader>

      <div className="max-w-2xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Product SKU *
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g. BL-PRO-001"
                className="mt-1 w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Professional CRM Suite"
                className="mt-1 w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enterprise software suite with modules for operations..."
              className="mt-1 w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Base Selling Price (Paise / Minor Units) *
              </label>
              <input
                type="text"
                required
                value={formData.baseSellingPriceMinor}
                onChange={(e) => setFormData({ ...formData, baseSellingPriceMinor: e.target.value })}
                placeholder="200000 for ₹2,000"
                className="mt-1 w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                200000 paise = ₹2,000.00
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Cost Price (Paise / Optional)
              </label>
              <input
                type="text"
                value={formData.costPriceMinor}
                onChange={(e) => setFormData({ ...formData, costPriceMinor: e.target.value })}
                placeholder="0"
                className="mt-1 w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Surcharge Variants Section */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Surcharge Variants</h4>
                <p className="text-xs text-slate-500">
                  Add modules or tiers with price adjustments in minor units
                </p>
              </div>
              <button
                type="button"
                onClick={addVariantRow}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variant</span>
              </button>
            </div>

            {variants.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No initial variants defined.</p>
            ) : (
              <div className="space-y-2.5">
                {variants.map((v, idx) => (
                  <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      placeholder="Variant Name"
                      value={v.name}
                      onChange={(e) => {
                        const newVars = [...variants];
                        newVars[idx]!.name = e.target.value;
                        setVariants(newVars);
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      placeholder="Variant SKU"
                      value={v.sku}
                      onChange={(e) => {
                        const newVars = [...variants];
                        newVars[idx]!.sku = e.target.value;
                        setVariants(newVars);
                      }}
                      className="w-32 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      placeholder="Surcharge Paise"
                      value={v.priceAdjustmentMinor}
                      onChange={(e) => {
                        const newVars = [...variants];
                        newVars[idx]!.priceAdjustmentMinor = e.target.value;
                        setVariants(newVars);
                      }}
                      className="w-28 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariantRow(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-200 flex justify-end space-x-3">
            <Link
              href="/admin/products"
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
