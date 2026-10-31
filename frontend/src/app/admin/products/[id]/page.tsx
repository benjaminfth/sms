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
        <div className="p-12 text-center text-[#94A3B8]">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#315CF5] border-t-transparent" />
          <p className="mt-2 text-[12px]">Loading product details...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!product) {
    return (
      <DashboardShell>
        <div className="p-8 text-center bg-white border border-[#E5EAF1] rounded-[10px]">
          <p className="text-[14px] font-medium text-[#172033]">Product not found</p>
          <Link
            href="/admin/products"
            className="mt-3 inline-block text-[13px] text-[#315CF5] hover:underline"
          >
            Back to Products
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-4">
        <Link
          href="/admin/products"
          className="inline-flex items-center text-[12px] font-medium text-[#64748B] hover:text-[#172033] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Products
        </Link>
      </div>

      <PageHeader
        title={`Edit: ${product.name}`}
        description={`SKU: ${product.sku} • Manage pricing and availability`}
        badge={<StatusBadge status={product.isActive ? "ACTIVE" : "INACTIVE"} />}
      />

      {error && (
        <div className="mb-6 p-3 bg-[#FDEDED] text-[#D14343] border border-[#F8C6C6] rounded-[8px] text-[12px] font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-3 bg-[#EDF7F2] text-[#16865B] border border-[#C7E8D8] rounded-[8px] text-[12px] font-medium">
          Product updated successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs space-y-4">
          <h2 className="text-[14px] font-semibold text-[#172033] pb-3 border-b border-[#E5EAF1]">
            Product Details
          </h2>

          <div>
            <label className="block text-[12px] font-medium text-[#172033] mb-1">
              Product Name <span className="text-[#D14343]">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#172033] mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#172033] mb-1">
              Base Selling Price (Paise) <span className="text-[#D14343]">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.baseSellingPriceMinor}
              onChange={(e) => setFormData({ ...formData, baseSellingPriceMinor: e.target.value })}
              className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
            />
            <span className="text-[11px] text-[#64748B] mt-1 block">
              ₹{(Number(formData.baseSellingPriceMinor || 0) / 100).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-2 text-[13px] text-[#172033] cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded-[4px] border-[#CBD5E1] text-[#315CF5] focus:ring-[#315CF5]"
              />
              <span className="font-medium">Active for new subscriptions and quotations</span>
            </label>
          </div>
        </div>

        {/* Existing Variants Display */}
        {product.variants && product.variants.length > 0 && (
          <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs">
            <h2 className="text-[14px] font-semibold text-[#172033] pb-3 border-b border-[#E5EAF1] mb-3">
              Configured Variants ({product.variants.length})
            </h2>
            <div className="space-y-2">
              {product.variants.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-2.5 bg-[#F8FAFC] rounded-[8px] border border-[#E5EAF1] text-[12px]"
                >
                  <div className="flex items-center space-x-2">
                    <Tag className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span className="font-medium text-[#172033]">{v.name}</span>
                    <span className="font-mono text-[11px] text-[#64748B] bg-white px-1.5 py-0.5 rounded border border-[#E5EAF1]">
                      {v.sku}
                    </span>
                  </div>
                  <span className="font-mono text-[#16865B] font-medium">
                    +₹{(Number(v.priceAdjustmentMinor) / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2.5">
          <Link
            href="/admin/products"
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
