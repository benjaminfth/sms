"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { api } from "@/lib/api-client";
import { ProductDTO } from "@sms/shared";
import { ArrowLeft, Save, Tag } from "lucide-react";

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    baseSellingPriceMinor: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await api.get<ProductDTO>(`/products/${productId}`);
        if (res.success && res.data) {
          setProduct(res.data);
          setFormData({
            name: res.data.name,
            description: res.data.description || "",
            baseSellingPriceMinor: res.data.baseSellingPriceMinor,
            isActive: res.data.isActive,
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await api.patch(`/products/${productId}`, formData);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="p-8 text-center text-slate-500">Loading product...</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title={product ? `Edit: ${product.name}` : "Edit Product"}
        description={`SKU: ${product?.sku}`}
      >
        <Link
          href="/admin/products"
          className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Catalog
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
              Product details saved successfully.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Product Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Base Selling Price (Paise)
              </label>
              <input
                type="text"
                required
                value={formData.baseSellingPriceMinor}
                onChange={(e) => setFormData({ ...formData, baseSellingPriceMinor: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
                Product is active for new sales
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Variants Sidebar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
            <Tag className="w-4 h-4 text-brand-600" />
            <span>Product Variants</span>
          </h3>
          <div className="space-y-2">
            {product?.variants && product.variants.length > 0 ? (
              product.variants.map((v) => (
                <div key={v.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-slate-900">{v.name}</span>
                    <StatusBadge status={v.isActive ? "ACTIVE" : "INACTIVE"} />
                  </div>
                  <div className="mt-1 flex justify-between items-center text-slate-500">
                    <span className="font-mono text-[11px]">{v.sku}</span>
                    <span className="text-emerald-600 font-semibold">
                      +<MoneyDisplay amountMinor={v.priceAdjustmentMinor} />
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No variants configured.</p>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
