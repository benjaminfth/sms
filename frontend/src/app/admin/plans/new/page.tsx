"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { ProductDTO } from "@sms/shared";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

export default function NewPlanPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    minQuantity: 1,
    startDate: "",
    endDate: "",
    autoCloseOnEndDate: true,
    allowEarlyClosure: false,
    allowPause: true,
    allowRenewal: true,
  });

  const [prices, setPrices] = useState([
    {
      currency: "INR",
      billingInterval: "MONTHLY",
      intervalCount: 1,
      amountMinor: "256000",
      setupFeeMinor: "0",
    },
  ]);

  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [items, setItems] = useState<
    Array<{ productId: string; productVariantId?: string; quantity: string }>
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActiveProducts() {
      try {
        const res = await api.get<ProductDTO[]>("/products", { pageSize: 50 });
        if (res.success && res.data) {
          setProducts(res.data.filter((p) => p.isActive && !p.isArchived));
        }
      } catch (err) {
        console.error("Failed to load products for plan creation:", err);
      }
    }
    loadActiveProducts();
  }, []);

  const addPriceTier = () => {
    setPrices([
      ...prices,
      {
        currency: "INR",
        billingInterval: "YEARLY",
        intervalCount: 1,
        amountMinor: "2560000",
        setupFeeMinor: "0",
      },
    ]);
  };

  const removePriceTier = (index: number) => {
    if (prices.length <= 1) return;
    setPrices(prices.filter((_, i) => i !== index));
  };

  const addItemRow = () => {
    if (products.length === 0) return;
    setItems([
      ...items,
      {
        productId: products[0]!.id,
        quantity: "1.000",
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        prices,
        items,
      };

      const res = await api.post("/plans", payload);
      if (res.success) {
        router.push("/admin/plans");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell>
      <div className="mb-4">
        <Link
          href="/admin/plans"
          className="inline-flex items-center text-[12px] font-medium text-[#64748B] hover:text-[#172033] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Plans
        </Link>
      </div>

      <PageHeader
        title="New Subscription Plan"
        description="Bundle offerings, establish recurring intervals and specify renewal rules."
      />

      {error && (
        <div className="mb-6 p-3 bg-[#FDEDED] text-[#D14343] border border-[#F8C6C6] rounded-[8px] text-[12px] font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Section 1: Plan Metadata */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <h2 className="text-[14px] font-semibold text-[#172033] pb-3 border-b border-[#E5EAF1] mb-4">
            Plan Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Plan Code <span className="text-[#D14343]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. SAAS-GROWTH-2026"
                className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Plan Name <span className="text-[#D14343]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Enterprise Growth Suite"
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Plan features, capabilities and target user volume..."
                className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pricing Frequencies */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1] mb-4">
            <div>
              <h2 className="text-[14px] font-semibold text-[#172033]">
                Billing Intervals & Pricing
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Configure frequency tiers (Monthly, Annual, etc.)
              </p>
            </div>
            <button
              type="button"
              onClick={addPriceTier}
              className="px-2.5 py-1 text-[12px] font-medium rounded-[6px] bg-[#F8FAFC] border border-[#E5EAF1] hover:bg-[#EFF4FE] hover:text-[#315CF5] text-[#172033] flex items-center space-x-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Frequency</span>
            </button>
          </div>

          <div className="space-y-3">
            {prices.map((p, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-center gap-3 bg-[#F8FAFC] p-3 rounded-[8px] border border-[#E5EAF1]"
              >
                <div className="w-full sm:w-44">
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                    Interval Frequency
                  </label>
                  <select
                    value={p.billingInterval}
                    onChange={(e) => {
                      const newP = [...prices];
                      newP[idx]!.billingInterval = e.target.value;
                      setPrices(newP);
                    }}
                    className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033]"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Annual / Yearly</option>
                  </select>
                </div>

                <div className="w-full sm:flex-1">
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                    Recurring Price (Paise)
                  </label>
                  <input
                    type="text"
                    required
                    value={p.amountMinor}
                    onChange={(e) => {
                      const newP = [...prices];
                      newP[idx]!.amountMinor = e.target.value;
                      setPrices(newP);
                    }}
                    placeholder="256000"
                    className="w-full px-2.5 py-1.5 text-[12px] font-mono bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033]"
                  />
                  <span className="text-[10px] text-[#64748B] mt-0.5 block">
                    ₹{(Number(p.amountMinor || 0) / 100).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="w-full sm:w-40">
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                    Setup Fee (Paise)
                  </label>
                  <input
                    type="text"
                    value={p.setupFeeMinor}
                    onChange={(e) => {
                      const newP = [...prices];
                      newP[idx]!.setupFeeMinor = e.target.value;
                      setPrices(newP);
                    }}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 text-[12px] font-mono bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033]"
                  />
                </div>

                {prices.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePriceTier(idx)}
                    className="p-1.5 text-[#94A3B8] hover:text-[#D14343] hover:bg-[#FDEDED] rounded-[6px] transition sm:mt-5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Bundled Products */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1] mb-4">
            <div>
              <h2 className="text-[14px] font-semibold text-[#172033]">Bundled Products</h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Software services provisioned with this subscription plan
              </p>
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="px-2.5 py-1 text-[12px] font-medium rounded-[6px] bg-[#F8FAFC] border border-[#E5EAF1] hover:bg-[#EFF4FE] hover:text-[#315CF5] text-[#172033] flex items-center space-x-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Attach Product</span>
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-[12px] text-[#94A3B8] italic py-2">
              No products attached yet. Click &quot;Attach Product&quot; to include catalog items in this plan.
            </p>
          ) : (
            <div className="space-y-2.5">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-[#F8FAFC] p-2.5 rounded-[8px] border border-[#E5EAF1]"
                >
                  <select
                    value={it.productId}
                    onChange={(e) => {
                      const newIt = [...items];
                      newIt[idx]!.productId = e.target.value;
                      newIt[idx]!.productVariantId = undefined;
                      setItems(newIt);
                    }}
                    className="flex-1 px-2.5 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033]"
                  >
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.sku})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Qty (e.g. 1.0)"
                    value={it.quantity}
                    onChange={(e) => {
                      const newIt = [...items];
                      newIt[idx]!.quantity = e.target.value;
                      setItems(newIt);
                    }}
                    className="w-24 px-2.5 py-1.5 text-[12px] font-mono bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033]"
                  />

                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="p-1.5 text-[#94A3B8] hover:text-[#D14343] hover:bg-[#FDEDED] rounded-[6px] transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Rules & Policies */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs">
          <h2 className="text-[14px] font-semibold text-[#172033] pb-3 border-b border-[#E5EAF1] mb-3">
            Lifecycle Policies
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
            <label className="flex items-center space-x-2 text-[#172033] cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowRenewal}
                onChange={(e) => setFormData({ ...formData, allowRenewal: e.target.checked })}
                className="rounded-[4px] border-[#CBD5E1] text-[#315CF5] focus:ring-[#315CF5]"
              />
              <span>Enable automatic recurring renewals</span>
            </label>
            <label className="flex items-center space-x-2 text-[#172033] cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowPause}
                onChange={(e) => setFormData({ ...formData, allowPause: e.target.checked })}
                className="rounded-[4px] border-[#CBD5E1] text-[#315CF5] focus:ring-[#315CF5]"
              />
              <span>Allow temporary subscription pause</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-2.5 pt-2">
          <Link
            href="/admin/plans"
            className="px-4 py-2 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px] transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] rounded-[8px] shadow-xs transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Save Plan"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
