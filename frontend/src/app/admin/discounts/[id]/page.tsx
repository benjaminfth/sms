"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { DiscountDTO, DiscountType } from "@sms/shared";
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Tag,
  Check,
  CheckCircle2,
  XCircle,
  Users,
  Receipt,
  Calendar,
  ShieldAlert,
  X,
} from "lucide-react";

export default function EditDiscountPage() {
  const params = useParams();
  const discountId = params.id as string;
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [discount, setDiscount] = useState<DiscountDTO | null>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    isActive: true,
    maxRedemptions: "",
    endDate: "",
  });

  useEffect(() => {
    async function loadDiscount() {
      setLoading(true);
      try {
        const [discRes, redRes] = await Promise.all([
          api.get<DiscountDTO>(`/discounts/${discountId}`),
          api.get<any>(`/discounts/${discountId}/redemptions`),
        ]);

        if (discRes.success && discRes.data) {
          const d = discRes.data;
          setDiscount(d);
          setFormData({
            name: d.name,
            isActive: d.isActive,
            maxRedemptions: d.maxRedemptions ? String(d.maxRedemptions) : "",
            endDate: d.endDate ? d.endDate.split("T")[0] || "" : "",
          });
        }

        if (redRes.success && redRes.data) {
          setRedemptions(redRes.data.applications || []);
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to load discount" });
      } finally {
        setLoading(false);
      }
    }

    loadDiscount();
  }, [discountId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await api.patch(`/discounts/${discountId}`, {
        name: formData.name.trim(),
        isActive: formData.isActive,
        maxRedemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions, 10) : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      });

      if (res.success) {
        setMessage({ type: "success", text: "Discount parameters updated successfully" });
      } else {
        setMessage({ type: "error", text: res.error?.message || "Failed to update discount" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="p-12 text-center text-[13px] text-text-secondary">
          Loading discount rules...
        </div>
      </DashboardShell>
    );
  }

  const isPct = discount?.discountType === DiscountType.PERCENTAGE;
  const displayVal = discount
    ? isPct
      ? `${(Number(discount.valueMinorOrBasisPoints) / 100).toFixed(1)}%`
      : `₹${(Number(discount.valueMinorOrBasisPoints) / 100).toLocaleString("en-IN")}`
    : "";

  return (
    <DashboardShell>
      <PageHeader
        title={`Discount: ${discount?.code}`}
        description="Inspect redemption audit trail and adjust active rules"
        badge={discount && <StatusBadge status={discount.isActive ? "ACTIVE" : "INACTIVE"} />}
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

      {message && (
        <div
          className={`mb-5 p-3 rounded-btn border text-[13px] font-medium flex items-center justify-between ${
            message.type === "success"
              ? "bg-status-success/10 border-status-success/20 text-status-success"
              : "bg-status-danger/10 border-status-danger/20 text-status-danger"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Snapshot & Edit Form */}
        <div className="space-y-6">
          {/* Quick Snapshot Card */}
          <div className="bg-surface-card p-5 rounded-card border border-border shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Discount Benefit
              </span>
              <Tag className="w-4 h-4 text-primary-accent" />
            </div>
            <div className="text-[26px] font-semibold text-text-primary tracking-tight font-mono">
              {displayVal}
            </div>
            <div className="text-[12px] text-text-secondary mt-0.5 capitalize">
              {discount?.discountType.toLowerCase().replace("_", " ")}
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[12px] text-text-secondary">
              <span>Total Redemptions:</span>
              <span className="font-medium text-text-primary font-mono">
                {discount?.currentRedemptions} / {discount?.maxRedemptions || "Unlimited"}
              </span>
            </div>
          </div>

          {/* Edit Parameters Form */}
          <div className="bg-surface-card p-5 rounded-card border border-border shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
              <h3 className="text-[14px] font-semibold text-text-primary">
                Rule Parameters
              </h3>
              {!isAdmin && (
                <span className="text-[11px] font-medium text-status-warning bg-status-warning/10 border border-status-warning/20 px-2 py-0.5 rounded-badge flex items-center">
                  <ShieldAlert className="w-3 h-3 mr-1" />
                  Read-Only
                </span>
              )}
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Discount Title
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAdmin}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-[13px] border border-border rounded-input px-3 py-2 bg-surface-card text-text-primary disabled:bg-surface-canvas disabled:text-text-muted focus:outline-hidden focus:border-primary-accent"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Redemption Limit
                </label>
                <input
                  type="number"
                  placeholder="Unlimited if empty"
                  disabled={!isAdmin}
                  value={formData.maxRedemptions}
                  onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                  className="w-full text-[13px] border border-border rounded-input px-3 py-2 bg-surface-card text-text-primary disabled:bg-surface-canvas disabled:text-text-muted focus:outline-hidden focus:border-primary-accent"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  disabled={!isAdmin}
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full text-[13px] border border-border rounded-input px-3 py-2 bg-surface-card text-text-primary disabled:bg-surface-canvas disabled:text-text-muted focus:outline-hidden focus:border-primary-accent"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isAdmin}
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-accent border-border focus:ring-primary-accent disabled:opacity-50"
                  />
                  <span className="text-[13px] font-medium text-text-primary">
                    Active rule
                  </span>
                </label>
              </div>

              {isAdmin && (
                <div className="pt-3 border-t border-border flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 text-[12px] font-medium rounded-btn text-white bg-primary-accent hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {saving ? "Saving..." : "Save Rule"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right: Redemptions Trail */}
        <div className="lg:col-span-2 bg-surface-card rounded-card border border-border p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
              <div>
                <h3 className="text-[15px] font-semibold text-text-primary">
                  Redemption Audit Trail
                </h3>
                <p className="text-[12px] text-text-secondary">
                  Chronological records of invoice and quotation deductions
                </p>
              </div>
              <span className="text-[12px] font-mono font-medium text-text-muted">
                {redemptions.length} applications
              </span>
            </div>

            {redemptions.length === 0 ? (
              <div className="p-12 text-center text-text-muted text-[13px]">
                No customer has redeemed this discount code yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-surface-canvas border-b border-border text-text-muted text-[11px] font-medium uppercase tracking-wider">
                      <th className="py-2.5 px-3">Document</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3 text-right">Deducted Amount</th>
                      <th className="py-2.5 px-3 text-right">Redeemed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {redemptions.map((red) => (
                      <tr key={red.id} className="hover:bg-surface-canvas/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-primary-accent text-[12px]">
                          {red.invoice?.invoiceNumber || red.quotation?.quotationNumber || "Direct"}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-text-primary">
                            {red.invoice?.customer?.fullName || "Customer"}
                          </div>
                          <div className="text-[11px] text-text-muted">
                            {red.invoice?.customer?.email}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-status-success">
                          -₹{(Number(red.amountDeductedMinor) / 100).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[12px] text-text-secondary">
                          {new Date(red.appliedAt).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
