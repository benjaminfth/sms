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
import { Search, Plus, Archive, Edit, Layers, Tag, X, Check } from "lucide-react";

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
      header: "Product & SKU",
      cell: (item) => (
        <div className="min-w-0 max-w-xs">
          <div className="flex items-center space-x-2">
            <Link
              href={`/admin/products/${item.id}`}
              className="font-medium text-[#172033] hover:text-[#315CF5] truncate block"
            >
              {item.name}
            </Link>
            <span className="text-[10px] bg-[#F1F5F9] font-mono px-1.5 py-0.5 rounded-[4px] text-[#64748B] border border-[#E5EAF1] shrink-0">
              {item.sku}
            </span>
          </div>
          {item.description && (
            <p className="text-[11px] text-[#64748B] truncate mt-0.5">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      header: "Type",
      cell: (item) => (
        <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider bg-[#F8FAFC] px-2 py-0.5 rounded-[4px] border border-[#E5EAF1]">
          {item.productType}
        </span>
      ),
    },
    {
      header: "Sales Price",
      align: "right",
      cell: (item) => (
        <span className="font-mono font-medium text-[#172033]">
          <MoneyDisplay amountMinor={item.baseSellingPriceMinor} currency={item.currency} />
        </span>
      ),
    },
    {
      header: "Variants",
      cell: (item) => (
        <div className="space-y-1">
          {item.variants && item.variants.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {item.variants.map((v) => (
                <span
                  key={v.id}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-[#F8FAFC] border border-[#E5EAF1] text-[11px] text-[#172033]"
                  title={`+ ₹${(Number(v.priceAdjustmentMinor) / 100).toLocaleString("en-IN")}`}
                >
                  <span className="font-medium">{v.name}</span>
                  <span className="text-[#16865B] font-mono ml-1 text-[10px]">
                    +₹{(Number(v.priceAdjustmentMinor) / 100).toLocaleString("en-IN")}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[12px] text-[#94A3B8] italic">No variants</span>
          )}
          {!item.isArchived && (
            <button
              onClick={() => {
                setVariantTarget(item);
                setVariantForm({ sku: `${item.sku}-VAR`, name: "", surchargeMinor: "50000" });
              }}
              className="text-[11px] font-medium text-[#315CF5] hover:text-[#2549D8] block mt-1"
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
      header: "Actions",
      align: "right",
      cell: (item) => (
        <div className="flex items-center justify-end space-x-1.5">
          <Link
            href={`/admin/products/${item.id}`}
            className="p-1.5 text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] rounded-[6px] transition"
            title="Edit Product"
          >
            <Edit className="w-3.5 h-3.5" />
          </Link>
          {!item.isArchived && (
            <button
              onClick={() => setArchiveTarget(item)}
              className="p-1.5 text-[#94A3B8] hover:text-[#D14343] hover:bg-[#FDEDED] rounded-[6px] transition"
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
        title="Products"
        description="Catalog of subscription offerings, service modules and surcharge variants."
        badge={
          pagination ? (
            <span className="px-2 py-0.5 rounded-[5px] bg-[#F1F5F9] border border-[#E5EAF1] text-[11px] font-medium text-[#64748B]">
              {pagination.total} Total
            </span>
          ) : undefined
        }
      >
        <Link
          href="/admin/products/new"
          className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] bg-[#315CF5] text-white hover:bg-[#2549D8] shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Product
        </Link>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-[10px] border border-[#E5EAF1] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by SKU or name..."
            className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-[#F8FAFC] border border-[#E5EAF1] rounded-[8px] focus:bg-white focus:outline-hidden focus:border-[#315CF5] text-[#172033] transition"
          />
        </div>

        <label className="flex items-center space-x-2 text-[12px] text-[#64748B] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded-[4px] border-[#CBD5E1] text-[#315CF5] focus:ring-[#315CF5]"
          />
          <span>Include archived catalog</span>
        </label>
      </div>

      <DataTable
        columns={columns}
        data={products}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
        emptyTitle="No products found"
        emptyDescription="Create software products to define recurring plan bundles."
      />

      {/* Confirm Archive Dialog */}
      <ConfirmDialog
        isOpen={!!archiveTarget}
        title="Archive Product"
        description={`Are you sure you want to archive "${archiveTarget?.name}"? It will no longer be available for new plans or quotes.`}
        confirmLabel="Archive"
        variant="danger"
        loading={archiveLoading}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />

      {/* Add Variant Modal */}
      {variantTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !variantLoading) setVariantTarget(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs"
        >
          <div className="bg-white rounded-[12px] max-w-md w-full p-6 shadow-dropdown border border-[#E5EAF1] animate-fade-in">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E5EAF1]">
              <div>
                <h3 className="text-[16px] font-semibold text-[#172033]">Add Product Variant</h3>
                <p className="text-[12px] text-[#64748B] mt-0.5">{variantTarget.name}</p>
              </div>
              <button
                onClick={() => setVariantTarget(null)}
                className="text-[#94A3B8] hover:text-[#172033] p-1 rounded-[6px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {variantError && (
              <div className="mt-4 p-2.5 bg-[#FDEDED] text-[#D14343] border border-[#F8C6C6] rounded-[8px] text-[12px] font-medium">
                {variantError}
              </div>
            )}

            <form onSubmit={handleAddVariant} className="mt-4 space-y-3.5 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">
                  Variant SKU <span className="text-[#D14343]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                  placeholder="e.g. PROD-ENTERPRISE"
                  className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">
                  Variant Name <span className="text-[#D14343]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                  placeholder="e.g. 24/7 Dedicated Support"
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">
                  Surcharge (in Paise)
                </label>
                <input
                  type="number"
                  required
                  value={variantForm.surchargeMinor}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, surchargeMinor: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
                />
                <span className="text-[11px] text-[#64748B] mt-1 block">
                  ₹{(Number(variantForm.surchargeMinor || 0) / 100).toLocaleString("en-IN")} additional charge
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#E5EAF1]">
                <button
                  type="button"
                  onClick={() => setVariantTarget(null)}
                  disabled={variantLoading}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={variantLoading}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] rounded-[8px] shadow-xs"
                >
                  {variantLoading ? "Adding..." : "Add Variant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
