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
    Array<{ sku: string; name: string; brand?: string; attribute?: string; priceAdjustmentMinor: string }>
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addVariantRow = () => {
    setVariants([
      ...variants,
      {
        sku: `${formData.sku ? formData.sku + "-" : ""}VAR-${variants.length + 1}`,
        name: "",
        brand: "",
        attribute: "",
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
      const res = await api.post<{ id: string }>("/products", {
        ...formData,
        variants: variants.map((v) => ({
          sku: v.sku,
          name: v.name,
          brand: v.brand || undefined,
          attribute: v.attribute || undefined,
          priceAdjustmentType: "SURCHARGE",
          priceAdjustmentMinor: v.priceAdjustmentMinor,
        })),
      });

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
      <div className="mb-4">
        <Link
          href="/admin/products"
          className="inline-flex items-center text-[12px] font-medium text-[#64748B] hover:text-[#172033] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Products
        </Link>
      </div>

      <PageHeader
        title="New Product"
        description="Define a new subscription software service or add-on product."
      />

      {error && (
        <div className="mb-6 p-3 bg-[#FDEDED] text-[#D14343] border border-[#F8C6C6] rounded-[8px] text-[12px] font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Section 1: General Information */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <h2 className="text-[14px] font-semibold text-[#172033] pb-3 border-b border-[#E5EAF1] mb-4">
            General Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Product SKU <span className="text-[#D14343]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g. BL-PRO-001"
                className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Product Name <span className="text-[#D14343]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Professional CRM Suite"
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enterprise subscription software suite with operations modules..."
                className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pricing */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <h2 className="text-[14px] font-semibold text-[#172033] pb-3 border-b border-[#E5EAF1] mb-4">
            Base Pricing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Base Selling Price (Paise) <span className="text-[#D14343]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.baseSellingPriceMinor}
                onChange={(e) => setFormData({ ...formData, baseSellingPriceMinor: e.target.value })}
                placeholder="200000"
                className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
              />
              <span className="text-[11px] text-[#64748B] mt-1 block">
                ₹{(Number(formData.baseSellingPriceMinor || 0) / 100).toLocaleString("en-IN")} sales price
              </span>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Cost Price (Paise / Optional)
              </label>
              <input
                type="text"
                value={formData.costPriceMinor}
                onChange={(e) => setFormData({ ...formData, costPriceMinor: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
              />
              <span className="text-[11px] text-[#64748B] mt-1 block">
                Internal baseline cost for margin reporting
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Initial Variants */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1] mb-4">
            <div>
              <h2 className="text-[14px] font-semibold text-[#172033]">Surcharge Variants</h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Add optional tiers, add-ons, or modules with price adjustments
              </p>
            </div>
            <button
              type="button"
              onClick={addVariantRow}
              className="px-2.5 py-1 text-[12px] font-medium rounded-[6px] bg-[#F8FAFC] border border-[#E5EAF1] hover:bg-[#EFF4FE] hover:text-[#315CF5] text-[#172033] flex items-center space-x-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Variant</span>
            </button>
          </div>

          {variants.length === 0 ? (
            <p className="text-[12px] text-[#94A3B8] italic py-2">
              No initial variants configured. You can also add variants after creating the product.
            </p>
          ) : (
            <div className="space-y-2.5">
              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-center gap-2 bg-[#F8FAFC] p-2.5 rounded-[8px] border border-[#E5EAF1]"
                >
                  <input
                    type="text"
                    placeholder="Variant Name *"
                    value={v.name}
                    onChange={(e) => {
                      const newVars = [...variants];
                      newVars[idx]!.name = e.target.value;
                      setVariants(newVars);
                    }}
                    className="flex-1 w-full sm:w-auto px-2.5 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033]"
                  />
                  <input
                    type="text"
                    placeholder="SKU *"
                    value={v.sku}
                    onChange={(e) => {
                      const newVars = [...variants];
                      newVars[idx]!.sku = e.target.value;
                      setVariants(newVars);
                    }}
                    className="w-full sm:w-32 px-2.5 py-1.5 text-[12px] font-mono bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033]"
                  />
                  <div className="w-full sm:w-36 flex items-center">
                    <input
                      type="text"
                      placeholder="+ Surcharge Paise"
                      value={v.priceAdjustmentMinor}
                      onChange={(e) => {
                        const newVars = [...variants];
                        newVars[idx]!.priceAdjustmentMinor = e.target.value;
                        setVariants(newVars);
                      }}
                      className="w-full px-2.5 py-1.5 text-[12px] font-mono bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVariantRow(idx)}
                    className="p-1.5 text-[#94A3B8] hover:text-[#D14343] hover:bg-[#FDEDED] rounded-[6px] transition shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-2.5 pt-2">
          <Link
            href="/admin/products"
            className="px-4 py-2 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px] transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] rounded-[8px] shadow-xs transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Save Product"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
