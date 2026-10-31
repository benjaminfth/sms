"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { api } from "@/lib/api-client";
import { PlanDTO } from "@sms/shared";
import { ArrowLeft, Layers, Calendar, CheckCircle, Save } from "lucide-react";

export default function EditPlanPage() {
  const params = useParams();
  const planId = params?.id as string;

  const [plan, setPlan] = useState<PlanDTO | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadPlan() {
      try {
        const res = await api.get<PlanDTO>(`/plans/${planId}`);
        if (res.success && res.data) {
          setPlan(res.data);
          setName(res.data.name);
          setDescription(res.data.description || "");
          setIsActive(res.data.isActive);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load plan details");
      } finally {
        setLoading(false);
      }
    }
    if (planId) loadPlan();
  }, [planId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await api.patch(`/plans/${planId}`, {
        name,
        description,
        isActive,
      });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="p-8 text-center text-slate-500">Loading plan...</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title={plan ? `Plan: ${plan.name}` : "Plan Details"}
        description={`Code: ${plan?.code}`}
      >
        <Link
          href="/admin/plans"
          className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Plans
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
              Plan saved successfully. Existing subscriptions remain unaffected.
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Plan Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
                Plan is active for new subscriptions
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Pricing Tiers and Items Inspector */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Configured Frequencies</span>
            </h3>
            <div className="space-y-2">
              {plan?.prices.map((p) => (
                <div key={p.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900">
                      <MoneyDisplay amountMinor={p.amountMinor} currency={p.currency} />
                    </span>
                    <span className="text-slate-500 ml-1">/ {p.billingInterval}</span>
                  </div>
                  <StatusBadge status={p.isActive ? "ACTIVE" : "INACTIVE"} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Included Products</span>
            </h3>
            <div className="space-y-2">
              {plan?.items && plan.items.length > 0 ? (
                plan.items.map((it) => (
                  <div key={it.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <p className="font-semibold text-slate-900">{it.product?.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Qty: {it.quantity} {it.productVariant ? `• Variant: ${it.productVariant.name}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No products attached.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
