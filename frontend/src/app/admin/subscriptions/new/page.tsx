"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { CustomerDTO, ProductDTO, PlanDTO, BillingInterval } from "@sms/shared";
import { formatMinorToCurrency } from "@sms/shared";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";

export default function NewSubscriptionPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [creationMode, setCreationMode] = useState<"PLAN" | "CUSTOM">("PLAN");
  const [planId, setPlanId] = useState("");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(BillingInterval.MONTHLY);
  const [intervalCount, setIntervalCount] = useState(1);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Custom Items state
  const [items, setItems] = useState([
    { productId: "", productVariantId: "", quantity: "1.000", unitPriceMinor: "0" },
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const [custRes, planRes, prodRes] = await Promise.all([
          api.get<CustomerDTO[]>("/customers", { pageSize: 100 }),
          api.get<PlanDTO[]>("/plans", { pageSize: 100 }),
          api.get<ProductDTO[]>("/products", { pageSize: 100 }),
        ]);
        if (custRes.data) setCustomers(custRes.data);
        if (planRes.data) setPlans(planRes.data);
        if (prodRes.data) setProducts(prodRes.data);
      } catch (err: any) {
        setError(err.message || "Failed to load master data");
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  const handleProductChange = (index: number, selectedProductId: string) => {
    const prod = products.find((p) => p.id === selectedProductId);
    const updated = [...items];
    if (prod && updated[index]) {
      updated[index].productId = prod.id;
      updated[index].productVariantId = "";
      updated[index].unitPriceMinor = prod.baseSellingPriceMinor;
      setItems(updated);
    }
  };

  const handleVariantChange = (index: number, variantId: string) => {
    const updated = [...items];
    const row = updated[index];
    if (!row) return;

    const prod = products.find((p) => p.id === row.productId);
    if (!prod) return;

    row.productVariantId = variantId;
    if (variantId) {
      const variant = prod.variants?.find((v) => v.id === variantId);
      if (variant) {
        const base = BigInt(prod.baseSellingPriceMinor);
        const surcharge = BigInt(variant.priceAdjustmentMinor);
        row.unitPriceMinor = (base + surcharge).toString();
      }
    } else {
      row.unitPriceMinor = prod.baseSellingPriceMinor;
    }
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError("Please select a customer");
      return;
    }

    if (creationMode === "PLAN" && !planId) {
      setError("Please select a subscription plan");
      return;
    }

    if (creationMode === "CUSTOM") {
      const validItems = items.filter((it) => it.productId);
      if (validItems.length === 0) {
        setError("Please add at least one valid product line item");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        customerId,
        billingInterval,
        intervalCount: Number(intervalCount) || 1,
        startDate: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
      };

      if (creationMode === "PLAN") {
        payload.planId = planId;
      } else {
        payload.items = items
          .filter((it) => it.productId)
          .map((it) => ({
            productId: it.productId,
            productVariantId: it.productVariantId || undefined,
            quantity: it.quantity,
            unitPriceMinor: it.unitPriceMinor,
          }));
      }

      const res = await api.post<any>("/subscriptions", payload);
      if (res.success && res.data) {
        router.push(`/admin/subscriptions/${res.data.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create subscription");
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Create New Subscription"
        description="Manually provision a recurring subscription for an existing customer."
      >
        <Link
          href="/admin/subscriptions"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Subscriptions
        </Link>
      </PageHeader>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Customer & Billing Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Customer <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                disabled={loadingInitial}
              >
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} {c.companyName ? `(${c.companyName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Subscription Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Billing Interval <span className="text-rose-500">*</span>
              </label>
              <select
                value={billingInterval}
                onChange={(e) => setBillingInterval(e.target.value as BillingInterval)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value={BillingInterval.MONTHLY}>Monthly</option>
                <option value={BillingInterval.YEARLY}>Yearly</option>
                <option value={BillingInterval.WEEKLY}>Weekly</option>
                <option value={BillingInterval.DAILY}>Daily</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Interval Count (Multiplier)
              </label>
              <input
                type="number"
                min="1"
                value={intervalCount}
                onChange={(e) => setIntervalCount(parseInt(e.target.value, 10) || 1)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Plan vs Custom Mode */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Subscription Products</h2>
            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCreationMode("PLAN")}
                className={`px-3 py-1 rounded-md transition-all ${
                  creationMode === "PLAN" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                Catalog Plan
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("CUSTOM")}
                className={`px-3 py-1 rounded-md transition-all ${
                  creationMode === "CUSTOM" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                Custom Items
              </button>
            </div>
          </div>

          {creationMode === "PLAN" ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Select Plan <span className="text-rose-500">*</span>
              </label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="">Select a subscription plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((row, index) => {
                const selectedProd = products.find((p) => p.id === row.productId);
                const variants = selectedProd?.variants?.filter((v) => v.isActive) || [];

                return (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-200"
                  >
                    <div className="col-span-5">
                      <select
                        required
                        value={row.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs bg-white"
                      >
                        <option value="">Select a product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatMinorToCurrency(p.baseSellingPriceMinor, p.currency)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <select
                        value={row.productVariantId || ""}
                        onChange={(e) => handleVariantChange(index, e.target.value)}
                        disabled={variants.length === 0}
                        className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs bg-white disabled:opacity-50"
                      >
                        <option value="">Base Product</option>
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} (+{formatMinorToCurrency(v.priceAdjustmentMinor)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => {
                          const updated = [...items];
                          if (updated[index]) updated[index].quantity = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs bg-white"
                      />
                    </div>

                    <div className="col-span-1 text-right font-mono text-xs font-semibold text-slate-800">
                      {formatMinorToCurrency(row.unitPriceMinor)}
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (items.length > 1) {
                            setItems(items.filter((_, i) => i !== index));
                          }
                        }}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  setItems([
                    ...items,
                    { productId: "", productVariantId: "", quantity: "1.000", unitPriceMinor: "0" },
                  ])
                }
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 mt-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Line Item
              </button>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-3">
          <Link
            href="/admin/subscriptions"
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-5 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {submitting ? "Saving..." : "Create Subscription"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
