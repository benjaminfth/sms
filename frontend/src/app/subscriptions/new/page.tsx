"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { ArrowLeft, Plus, Trash2, Check } from "lucide-react";
import Link from "next/link";

export default function NewSubscriptionPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [creationMode, setCreationMode] = useState<"PLAN" | "CUSTOM">("PLAN");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedPlanPriceId, setSelectedPlanPriceId] = useState("");
  const [billingInterval, setBillingInterval] = useState("MONTHLY");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<any[]>([
    { productId: "", productVariantId: "", quantity: "1.000", unitPriceMinor: "" },
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersData, productsData, plansData] = await Promise.all([
          api.get<any[]>("/customers"),
          api.get<any[]>("/products"),
          api.get<any[]>("/plans"),
        ]);
        setCustomers(customersData || []);
        setProducts(productsData || []);
        setPlans(plansData || []);

        if (customersData?.[0]) setCustomerId(customersData[0].id);
        if (plansData?.[0]) {
          setSelectedPlanId(plansData[0].id);
          if (plansData[0].prices?.[0]) {
            setSelectedPlanPriceId(plansData[0].prices[0].id);
            setBillingInterval(plansData[0].prices[0].billingInterval);
          }
        }
        if (productsData?.[0]) {
          setItems([
            {
              productId: productsData[0].id,
              productVariantId: productsData[0].variants?.[0]?.id || "",
              quantity: "1.000",
              unitPriceMinor: productsData[0].baseSellingPriceMinor,
            },
          ]);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load master data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan?.prices?.[0]) {
      setSelectedPlanPriceId(plan.prices[0].id);
      setBillingInterval(plan.prices[0].billingInterval);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError("Please select a customer");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        customerId,
        startDate: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
        billingInterval,
        intervalCount: 1,
      };

      if (creationMode === "PLAN") {
        payload.planId = selectedPlanId;
        payload.planPriceId = selectedPlanPriceId;
      } else {
        payload.items = items.map((i) => ({
          productId: i.productId,
          productVariantId: i.productVariantId || undefined,
          quantity: i.quantity,
          unitPriceMinor: i.unitPriceMinor || undefined,
        }));
      }

      const subscription = await api.post<any>("/subscriptions", payload);
      router.push(`/subscriptions/${subscription.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create subscription");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
        <p className="text-sm">Loading...</p>
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link
          href="/subscriptions"
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Subscription</h1>
          <p className="text-sm text-slate-500">
            Directly provision an active recurring subscription for a customer
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Customer *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} {c.companyName ? `(${c.companyName})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Provisioning Mode
              </label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setCreationMode("PLAN")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    creationMode === "PLAN" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"
                  }`}
                >
                  Standard Plan
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode("CUSTOM")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    creationMode === "CUSTOM" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"
                  }`}
                >
                  Custom Products
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subscription Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {creationMode === "PLAN" ? (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Selected Plan
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Plan Frequency & Price
                </label>
                <select
                  value={selectedPlanPriceId}
                  onChange={(e) => {
                    setSelectedPlanPriceId(e.target.value);
                    const pr = selectedPlan?.prices.find((p: any) => p.id === e.target.value);
                    if (pr) setBillingInterval(pr.billingInterval);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {selectedPlan?.prices?.map((pr: any) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.billingInterval} — ₹{(parseInt(pr.amountMinor, 10) / 100).toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Custom Products & Quantities
              </label>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx].productId = e.target.value;
                      setItems(updated);
                    }}
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-sm bg-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx].quantity = e.target.value;
                      setItems(updated);
                    }}
                    className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-md text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    disabled={items.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            href="/subscriptions"
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm"
          >
            <Check className="w-4 h-4 mr-2" />
            {submitting ? "Provisioning..." : "Create Subscription"}
          </button>
        </div>
      </form>
    </div>
  );
}

