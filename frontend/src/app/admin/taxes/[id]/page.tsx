"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
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

          // Product IDs linked
          const assigned = new Set<string>();
          if (t.productTaxes) {
            t.productTaxes.forEach((pt) => assigned.add(pt.productId));
          }
          setAssignedProductIds(assigned);
        }

        if (productsRes.success && productsRes.data) {
          setAllProducts(productsRes.data);
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to load tax details" });
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

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await api.patch(`/taxes/${taxId}`, {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        rateBasisPoints: formData.rateBasisPoints,
        isActive: formData.isActive,
      });

      if (res.success) {
        setMessage({ type: "success", text: "Tax details updated successfully" });
      } else {
        setMessage({ type: "error", text: res.error?.message || "Failed to update tax" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error updating tax" });
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
      // Loop over products and sync tax
      const promises = allProducts.map(async (prod) => {
        const isAssigned = assignedProductIds.has(prod.id);
        const existingTaxesRes = await api.get<TaxDTO[]>(`/products/${prod.id}/taxes`);
        const existingTaxIds = (existingTaxesRes.data || []).map((t) => t.id);

        let newTaxIds: string[];
        if (isAssigned) {
          newTaxIds = Array.from(new Set([...existingTaxIds, taxId]));
        } else {
          newTaxIds = existingTaxIds.filter((id) => id !== taxId);
        }

        return api.post(`/products/${prod.id}/taxes`, { taxIds: newTaxIds });
      });

      await Promise.all(promises);
      setMessage({ type: "success", text: "Product tax assignments updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update product tax assignments" });
    } finally {
      setSavingProducts(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
          <p className="text-xs text-slate-400 mt-2 font-medium">Loading tax details...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title={`Configure Tax: ${formData.code}`}
        description="Edit tax parameters and manage assigned products"
      >
        <Link
          href="/admin/taxes"
          className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Taxes
        </Link>
      </PageHeader>

      {message && (
        <div
          className={`mb-6 p-3.5 rounded-lg border text-xs flex items-center ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <Check className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mr-2 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tax Details Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Tax Configuration
          </h3>

          <form onSubmit={handleSaveTax} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Code</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.ratePercent}
                  onChange={(e) => handlePercentChange(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Basis Points (bps)</label>
                <input
                  type="number"
                  value={formData.rateBasisPoints}
                  onChange={(e) => handleBpsChange(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-xs font-mono border border-slate-200 rounded px-2.5 py-1.5 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="editIsActive" className="text-xs font-medium text-slate-700">
                Active tax rule
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Assigned Products Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Product Tax Assignments</h3>
                <p className="text-xs text-slate-500">
                  Select which catalog products this tax automatically applies to
                </p>
              </div>
              <span className="text-xs font-mono font-semibold bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full">
                {assignedProductIds.size} selected
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {allProducts.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No products available in catalog.</p>
              ) : (
                allProducts.map((prod) => {
                  const isChecked = assignedProductIds.has(prod.id);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => toggleProductAssignment(prod.id)}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition ${
                        isChecked
                          ? "bg-brand-50/60 border-brand-200 text-brand-900 font-medium"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-brand-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold">{prod.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{prod.sku}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-mono text-slate-500">
                          Base: ₹{(Number(prod.baseSellingPriceMinor) / 100).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleSaveProductAssignments}
              disabled={savingProducts}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {savingProducts ? "Updating Assignments..." : "Save Product Assignments"}
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
