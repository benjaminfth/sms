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
      setError("Please select a customer.");
      return;
    }

    if (creationMode === "PLAN" && !planId) {
      setError("Please select a subscription plan.");
      return;
    }

    if (creationMode === "CUSTOM") {
      const validItems = items.filter((it) => it.productId);
      if (validItems.length === 0) {
        setError("Please add at least one valid product line item.");
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
      <div className="mb-4">
        <Link
          href="/admin/subscriptions"
          className="inline-flex items-center text-[12px] font-medium text-[#64748B] hover:text-[#172033] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Subscriptions
        </Link>
      </div>

      <PageHeader
        title="New Subscription"
        description="Provision a recurring subscription contract for an existing enterprise customer."
      />

      {error && (
        <div className="bg-[#FDEDED] border border-[#F8C6C6] text-[#D14343] px-3.5 py-2.5 rounded-[8px] mb-6 text-[12px] font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Customer & Schedule Section */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs space-y-4">
          <h2 className="text-[14px] font-semibold text-[#172033] pb-3 border-b border-[#E5EAF1]">
            Customer & Schedule
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Customer <span className="text-[#D14343]">*</span>
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
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
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Start Date <span className="text-[#D14343]">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Billing Interval <span className="text-[#D14343]">*</span>
              </label>
              <select
                value={billingInterval}
                onChange={(e) => setBillingInterval(e.target.value as BillingInterval)}
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              >
                <option value={BillingInterval.WEEKLY}>Weekly</option>
                <option value={BillingInterval.MONTHLY}>Monthly</option>
                <option value={BillingInterval.DAILY}>Daily</option>
                <option value={BillingInterval.YEARLY}>Yearly / Annual</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Interval Multiplier
              </label>
              <input
                type="number"
                min="1"
                value={intervalCount}
                onChange={(e) => setIntervalCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              />
              <span className="text-[11px] text-[#64748B] mt-0.5 block">
                Every {intervalCount} {billingInterval.toLowerCase()} cycle(s)
              </span>
            </div>
          </div>
        </div>

        {/* Provisioning Source Selection */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
            <h2 className="text-[14px] font-semibold text-[#172033]">Subscription Package</h2>
            <div className="flex p-0.5 bg-[#F8FAFC] border border-[#E5EAF1] rounded-[6px] text-[12px]">
              <button
                type="button"
                onClick={() => setCreationMode("PLAN")}
                className={`px-3 py-1 rounded-[5px] font-medium transition ${
                  creationMode === "PLAN"
                    ? "bg-white text-[#172033] shadow-xs"
                    : "text-[#64748B] hover:text-[#172033]"
                }`}
              >
                Standard Plan Tier
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("CUSTOM")}
                className={`px-3 py-1 rounded-[5px] font-medium transition ${
                  creationMode === "CUSTOM"
                    ? "bg-white text-[#172033] shadow-xs"
                    : "text-[#64748B] hover:text-[#172033]"
                }`}
              >
                Custom Line Items
              </button>
            </div>
          </div>

          {creationMode === "PLAN" ? (
            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Select Active Plan <span className="text-[#D14343]">*</span>
              </label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
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
                const selectedProduct = products.find((p) => p.id === row.productId);
                const availableVariants = selectedProduct?.variants?.filter((v) => v.isActive) || [];

                return (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row items-center gap-3 bg-[#F8FAFC] p-3 rounded-[8px] border border-[#E5EAF1]"
                  >
                    <div className="w-full sm:flex-1">
                      <label className="block text-[11px] font-medium text-[#64748B] mb-1">Product</label>
                      <select
                        required
                        value={row.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033]"
                      >
                        <option value="">Select a product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatMinorToCurrency(p.baseSellingPriceMinor, p.currency)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full sm:w-44">
                      <label className="block text-[11px] font-medium text-[#64748B] mb-1">Variant</label>
                      <select
                        value={row.productVariantId || ""}
                        onChange={(e) => handleVariantChange(index, e.target.value)}
                        disabled={availableVariants.length === 0}
                        className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033] disabled:opacity-50"
                      >
                        <option value="">Base Product</option>
                        {availableVariants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} (+{formatMinorToCurrency(v.priceAdjustmentMinor)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full sm:w-20">
                      <label className="block text-[11px] font-medium text-[#64748B] mb-1">Qty</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => {
                          const newIt = [...items];
                          newIt[index]!.quantity = e.target.value;
                          setItems(newIt);
                        }}
                        className="w-full px-2.5 py-1.5 text-[12px] font-mono bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033]"
                      />
                    </div>

                    <div className="w-full sm:w-28 text-right">
                      <label className="block text-[11px] font-medium text-[#64748B] mb-1">Price</label>
                      <span className="text-[12px] font-mono font-medium text-[#172033] block py-1.5">
                        {formatMinorToCurrency(row.unitPriceMinor)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-2.5 pt-2">
          <Link
            href="/admin/subscriptions"
            className="px-4 py-2 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px] transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] rounded-[8px] shadow-xs transition disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Provision Subscription"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
