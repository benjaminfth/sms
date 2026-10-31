"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { api } from "@/lib/api-client";
import { ProductDTO, PaginationMeta } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Search, Plus, Archive, Edit, Layers, Tag, X } from "lucide-react";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  // Archive modal state
  const [archiveTarget, setArchiveTarget] = useState<ProductDTO | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Quick Variant Modal state
  const [variantTarget, setVariantTarget] = useState<ProductDTO | null>(null);
  const [variantForm, setVariantForm] = useState({
    sku: "",
    name: "",
    surchargeMinor: "50000",
  });
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ProductDTO[]>("/products", {
        page,
        pageSize: 10,
        search: search || undefined,
        includeArchived: includeArchived ? "true" : undefined,
      });
      if (res.success && res.data) {
        setProducts(res.data);
        setPagination(res.meta);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, includeArchived]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setArchiveLoading(true);
    try {
      await api.delete(`/products/${archiveTarget.id}`);
      setArchiveTarget(null);
      fetchProducts();
    } catch (err) {
      console.error("Failed to archive product:", err);
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantTarget) return;
    setVariantLoading(true);
    setVariantError(null);

    try {
      const res = await api.post(`/products/${variantTarget.id}/variants`, {
        sku: variantForm.sku,
        name: variantForm.name,
        priceAdjustmentType: "SURCHARGE",
        priceAdjustmentMinor: variantForm.surchargeMinor,
      });
      if (res.success) {
        setVariantTarget(null);
        setVariantForm({ sku: "", name: "", surchargeMinor: "50000" });
        fetchProducts();
      }
    } catch (err: any) {
      setVariantError(err.message || "Failed to create variant");
    } finally {
      setVariantLoading(false);
    }
  };

  const columns: Column<ProductDTO>[] = [
    {
      header: "Product Details",
      cell: (item) => (
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-900">{item.name}</span>
            <span className="text-[10px] bg-slate-100 font-mono px-1.5 py-0.5 rounded text-slate-600">
              {item.sku}
            </span>
          </div>
          {item.description && (
            <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      header: "Base Price",
      cell: (item) => (
        <span className="font-semibold text-slate-900">
          <MoneyDisplay amountMinor={item.baseSellingPriceMinor} currency={item.currency} />
        </span>
      ),
    },
    {
      header: "Variants (Surcharges)",
      cell: (item) => (
        <div className="space-y-1">
          {item.variants && item.variants.length > 0 ? (
            item.variants.map((v) => (
              <div key={v.id} className="text-xs flex items-center space-x-1.5">
                <Tag className="w-3 h-3 text-slate-400" />
                <span className="font-medium text-slate-700">{v.name}:</span>
                <span className="text-emerald-600 font-semibold">
                  +<MoneyDisplay amountMinor={v.priceAdjustmentMinor} />
                </span>
              </div>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">No variants</span>
          )}
          {!item.isArchived && (
            <button
              onClick={() => {
                setVariantTarget(item);
                setVariantForm({ sku: `${item.sku}-VAR`, name: "", surchargeMinor: "50000" });
              }}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 block mt-1"
            >
              + Add Variant
            </button>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      cell: (item) => (
        <StatusBadge
          status={item.isArchived ? "ARCHIVED" : item.isActive ? "ACTIVE" : "INACTIVE"}
        />
      ),
    },
    {
      header: "Created",
      cell: (item) => <span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span>,
    },
    {
      header: "Actions",
      cell: (item) => (
        <div className="flex items-center space-x-2">
          <Link
            href={`/admin/products/${item.id}`}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Edit Product"
          >
            <Edit className="w-3.5 h-3.5" />
          </Link>
          {!item.isArchived && (
            <button
              onClick={() => setArchiveTarget(item)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
              title="Archive Product"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Product Catalog"
        description="Manage software offerings, base pricing, and surcharge variants"
      >
        <Link
          href="/admin/products/new"
          className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Product
        </Link>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products by SKU or name..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500 text-slate-900"
          />
        </div>

        <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>Include Archived Products</span>
        </label>
      </div>

      <DataTable
        columns={columns}
        data={products}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!archiveTarget}
        title="Archive Product"
        description={`Are you sure you want to archive '${archiveTarget?.name}' (${archiveTarget?.sku})? This product will no longer be available for new quotations or subscriptions.`}
        confirmLabel="Archive"
        variant="danger"
        loading={archiveLoading}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />

      {/* Add Variant Modal */}
      {variantTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Product Variant</h3>
                <p className="text-xs text-slate-400">For product: {variantTarget.name}</p>
              </div>
              <button
                onClick={() => setVariantTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {variantError && (
              <div className="mt-3 p-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
                {variantError}
              </div>
            )}

            <form onSubmit={handleAddVariant} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Variant Name</label>
                <input
                  type="text"
                  required
                  value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                  placeholder="e.g. Advanced Module"
                  className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Variant SKU</label>
                <input
                  type="text"
                  required
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                  placeholder="e.g. BL-PRO-ADV"
                  className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Surcharge Amount (in Paise / Minor Units)
                </label>
                <input
                  type="text"
                  required
                  value={variantForm.surchargeMinor}
                  onChange={(e) => setVariantForm({ ...variantForm, surchargeMinor: e.target.value })}
                  placeholder="56000 for ₹560"
                  className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Example: 56000 paise = ₹560 surcharge. Added to base price via integer arithmetic.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVariantTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={variantLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
                >
                  {variantLoading ? "Saving..." : "Add Variant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
