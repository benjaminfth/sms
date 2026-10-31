"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/api-client";
import { TaxDTO, ProductDTO } from "@sms/shared";
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Package,
  Check,
  CheckCircle2,
  XCircle,
  CheckSquare,
  Square,
  X,
} from "lucide-react";

export default function EditTaxPage() {
  const params = useParams();
  const router = useRouter();
  const taxId = params.id as string;

  const [tax, setTax] = useState<TaxDTO | null>(null);
  const [allProducts, setAllProducts] = useState<ProductDTO[]>([]);
  const [assignedProductIds, setAssignedProductIds] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    rateBasisPoints: 0,
    ratePercent: "0.00",
    isActive: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [taxRes, productsRes] = await Promise.all([
          api.get<TaxDTO>(`/taxes/${taxId}`),
          api.get<ProductDTO[]>("/products", { pageSize: 100 }),
        ]);

        if (taxRes.success && taxRes.data) {
          const t = taxRes.data;
          setTax(t);
          setFormData({
            name: t.name,
            code: t.code,
            rateBasisPoints: t.rateBasisPoints,
            ratePercent: (t.rateBasisPoints / 100).toFixed(2),
            isActive: t.isActive,
          });

          if ((t as any).products) {
            const ids = new Set<string>((t as any).products.map((p: any) => p.productId || p.id));
            setAssignedProductIds(ids);
          }
        }

        if (productsRes.success && productsRes.data) {
          setAllProducts(productsRes.data);
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to load tax rate" });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [taxId]);

  const handlePercentChange = (val: string) => {
    const num = parseFloat(val);
    const bps = isNaN(num) ? 0 : Math.round(num * 100);
    setFormData((prev) => ({
      ...prev,
      ratePercent: val,
      rateBasisPoints: bps,
    }));
  };

  const handleBpsChange = (bps: number) => {
    const pct = (bps / 100).toFixed(2);
    setFormData((prev) => ({
      ...prev,
      rateBasisPoints: bps,
      ratePercent: pct,
    }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const res = await api.put<TaxDTO>(`/taxes/${taxId}`, {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        rateBasisPoints: formData.rateBasisPoints,
        isActive: formData.isActive,
      });

      if (res.success && res.data) {
        setTax(res.data);
        setMessage({ type: "success", text: "Tax rate configuration updated successfully" });
      } else {
        setMessage({ type: "error", text: res.error?.message || "Failed to update tax" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setSaving(false);
    }
  };

  const toggleProductAssignment = (productId: string) => {
    setAssignedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleSaveProductAssignments = async () => {
    setSavingProducts(true);
    setMessage(null);
    try {
      const res = await api.post(`/taxes/${taxId}/assign-products`, {
        productIds: Array.from(assignedProductIds),
      });

      if (res.success) {
        setMessage({ type: "success", text: "Assigned catalog products updated successfully" });
      } else {
        setMessage({ type: "error", text: res.error?.message || "Failed to assign products" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setSavingProducts(false);
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title={`Tax Rate: ${tax?.name || "Loading..."}`}
        description="Configure tax statutory rate and map to applicable product catalog items"
        badge={tax && <StatusBadge status={tax.isActive ? "ACTIVE" : "INACTIVE"} />}
        actions={
          <Link
            href="/admin/taxes"
            className="inline-flex items-center px-3 py-1.5 border border-border rounded-btn text-[13px] font-medium text-text-primary bg-surface-card hover:bg-surface-canvas transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Taxes
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
        {/* Left Form: Tax Details */}
        <div className="lg:col-span-2 bg-surface-card rounded-card border border-border p-6 shadow-xs">
          <h3 className="text-[15px] font-semibold text-text-primary mb-4 pb-3 border-b border-border">
            Configuration Details
          </h3>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-text-primary mb-1">
                Tax Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-[13px] border border-border rounded-input px-3.5 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-text-primary mb-1">
                Tax Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full text-[13px] font-mono border border-border rounded-input px-3.5 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Tax Rate (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={formData.ratePercent}
                    onChange={(e) => handlePercentChange(e.target.value)}
                    className="w-full text-[13px] font-mono border border-border rounded-input px-3.5 py-2 pr-8 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-text-muted">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Basis Points (bps)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={formData.rateBasisPoints}
                  onChange={(e) => handleBpsChange(parseInt(e.target.value) || 0)}
                  className="w-full text-[13px] font-mono border border-border rounded-input px-3.5 py-2 bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-primary-accent border-border focus:ring-primary-accent"
                />
                <span className="text-[13px] font-medium text-text-primary">
                  Active statutory tax rule
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 text-[12px] font-medium rounded-btn text-white bg-primary-accent hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-xs"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? "Updating..." : "Save Configuration"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Form: Product Assignments */}
        <div className="bg-surface-card rounded-card border border-border p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
            <h3 className="text-[15px] font-semibold text-text-primary">
              Assigned Products
            </h3>
            <span className="text-[12px] font-mono text-text-muted">
              {assignedProductIds.size} linked
            </span>
          </div>

          <p className="text-[12px] text-text-secondary mb-3">
            Select products subject to this tax rule during invoice generation:
          </p>

          <div className="flex-1 max-h-80 overflow-y-auto space-y-1.5 pr-1 border border-border rounded-input p-2 mb-4 bg-surface-canvas">
            {allProducts.map((p) => {
              const isChecked = assignedProductIds.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggleProductAssignment(p.id)}
                  className={`flex items-center justify-between p-2 rounded-btn text-[12px] cursor-pointer transition-colors ${
                    isChecked
                      ? "bg-surface-card text-text-primary font-medium border border-primary-accent/40 shadow-xs"
                      : "text-text-secondary hover:bg-surface-card/60"
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate pr-2">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-primary-accent shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-text-muted shrink-0" />
                    )}
                    <span className="truncate">{p.name}</span>
                  </div>
                  <span className="font-mono text-[11px] text-text-muted shrink-0">
                    {p.sku}
                  </span>
                </div>
              );
            })}
            {allProducts.length === 0 && (
              <div className="text-center py-6 text-[12px] text-text-muted">
                No products found in catalog.
              </div>
            )}
          </div>

          <button
            onClick={handleSaveProductAssignments}
            disabled={savingProducts}
            className="w-full inline-flex items-center justify-center px-4 py-2 text-[12px] font-medium rounded-btn border border-border bg-surface-card hover:bg-surface-canvas text-text-primary transition-colors disabled:opacity-50 shadow-xs"
          >
            <Check className="w-3.5 h-3.5 mr-1.5 text-primary-accent" />
            {savingProducts ? "Saving..." : "Update Product Mappings"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
