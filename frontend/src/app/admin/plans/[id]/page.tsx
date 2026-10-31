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
        <div className="p-12 text-center text-[#94A3B8]">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#315CF5] border-t-transparent" />
          <p className="mt-2 text-[12px]">Loading plan details...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!plan) {
    return (
      <DashboardShell>
        <div className="p-8 text-center bg-white border border-[#E5EAF1] rounded-[10px]">
          <p className="text-[14px] font-medium text-[#172033]">Plan not found</p>
          <Link href="/admin/plans" className="mt-3 inline-block text-[13px] text-[#315CF5]">
            Back to Plans
          </Link>
        </div>
      </DashboardShell>
    );
  }

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
        title={`Plan: ${plan.name}`}
        description={`Code: ${plan.code} • Configure tier settings and rules`}
        badge={<StatusBadge status={plan.isActive ? "ACTIVE" : "INACTIVE"} />}
      />

      {error && (
        <div className="mb-6 p-3 bg-[#FDEDED] text-[#D14343] border border-[#F8C6C6] rounded-[8px] text-[12px] font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-3 bg-[#EDF7F2] text-[#16865B] border border-[#C7E8D8] rounded-[8px] text-[12px] font-medium">
          Plan configuration saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs space-y-4">
          <h2 className="text-[14px] font-semibold text-[#172033] pb-3 border-b border-[#E5EAF1]">
            Plan Configuration
          </h2>

          <div>
            <label className="block text-[12px] font-medium text-[#172033] mb-1">
              Plan Name <span className="text-[#D14343]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#172033] mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-2 text-[13px] text-[#172033] cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded-[4px] border-[#CBD5E1] text-[#315CF5] focus:ring-[#315CF5]"
              />
              <span className="font-medium">Active and open for new subscriptions</span>
            </label>
          </div>
        </div>

        {/* Existing Price Tiers */}
        {plan.prices && plan.prices.length > 0 && (
          <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs">
            <h2 className="text-[14px] font-semibold text-[#172033] pb-3 border-b border-[#E5EAF1] mb-3">
              Configured Billing Tiers
            </h2>
            <div className="space-y-2">
              {plan.prices.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 bg-[#F8FAFC] rounded-[8px] border border-[#E5EAF1] text-[12px]"
                >
                  <span className="font-medium uppercase tracking-wider font-mono text-[#64748B]">
                    {p.intervalCount > 1 ? `${p.intervalCount} ` : ""}{p.billingInterval}
                  </span>
                  <span className="font-mono text-[#172033] font-semibold">
                    <MoneyDisplay amountMinor={p.amountMinor} currency={p.currency} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2.5">
          <Link
            href="/admin/plans"
            className="px-4 py-2 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px] transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] rounded-[8px] shadow-xs transition flex items-center space-x-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
