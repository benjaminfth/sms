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
      <PageHeader
        title="Create Subscription Plan"
        description="Bundle products and configure multi-frequency pricing tiers"
      >
        <Link
          href="/admin/plans"
          className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Plans
        </Link>
      </PageHeader>

      <div className="max-w-3xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Plan Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. PLAN-PRO-MONTHLY"
                className="mt-1 w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Plan Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Professional Plan"
                className="mt-1 w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Full software suite billed on recurring schedule..."
              className="mt-1 w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Pricing Tiers */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Billing Frequencies & Pricing *</h4>
                <p className="text-xs text-slate-500">Add monthly, yearly, or custom frequency pricing</p>
              </div>
              <button
                type="button"
                onClick={addPriceTier}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Price Tier</span>
              </button>
            </div>

            <div className="space-y-3">
              {prices.map((p, idx) => (
                <div key={idx} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="w-32">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Frequency</label>
                    <select
                      value={p.billingInterval}
                      onChange={(e) => {
                        const newPrices = [...prices];
                        newPrices[idx]!.billingInterval = e.target.value;
                        setPrices(newPrices);
                      }}
                      className="mt-0.5 w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>

                  <div className="w-24">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Interval</label>
                    <input
                      type="number"
                      min={1}
                      value={p.intervalCount}
                      onChange={(e) => {
                        const newPrices = [...prices];
                        newPrices[idx]!.intervalCount = parseInt(e.target.value) || 1;
                        setPrices(newPrices);
                      }}
                      className="mt-0.5 w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                      Amount (Paise / Minor)
                    </label>
                    <input
                      type="text"
                      value={p.amountMinor}
                      onChange={(e) => {
                        const newPrices = [...prices];
                        newPrices[idx]!.amountMinor = e.target.value;
                        setPrices(newPrices);
                      }}
                      placeholder="256000 for ₹2,560"
                      className="mt-0.5 w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>

                  {prices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePriceTier(idx)}
                      className="mt-4 p-1.5 text-slate-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Included Products */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Included Catalog Items</h4>
                <p className="text-xs text-slate-500">Products and optional variants packaged into this plan</p>
              </div>
              <button
                type="button"
                onClick={addItemRow}
                disabled={products.length === 0}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center space-x-1 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No product items added yet.</p>
            ) : (
              <div className="space-y-2.5">
                {items.map((it, idx) => {
                  const selectedProd = products.find((p) => p.id === it.productId);
                  return (
                    <div key={idx} className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <select
                        value={it.productId}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[idx]!.productId = e.target.value;
                          newItems[idx]!.productVariantId = undefined;
                          setItems(newItems);
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>

                      {selectedProd?.variants && selectedProd.variants.length > 0 && (
                        <select
                          value={it.productVariantId || ""}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx]!.productVariantId = e.target.value || undefined;
                            setItems(newItems);
                          }}
                          className="w-48 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                        >
                          <option value="">Base Product (No Variant)</option>
                          {selectedProd.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} (+₹{parseInt(v.priceAdjustmentMinor) / 100})
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-200 flex justify-end space-x-3">
            <Link
              href="/admin/plans"
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
