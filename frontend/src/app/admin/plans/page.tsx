"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { api } from "@/lib/api-client";
import { PlanDTO, PaginationMeta } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Layers, CheckCircle2, XCircle } from "lucide-react";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PlanDTO[]>("/plans", {
        page,
        pageSize: 10,
        search: search || undefined,
      });
      if (res.success && res.data) {
        setPlans(res.data);
        setPagination(res.meta);
      }
    } catch (err) {
      console.error("Failed to load plans:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const togglePlanStatus = async (planId: string, currentStatus: boolean) => {
    try {
      const endpoint = currentStatus
        ? `/plans/${planId}/deactivate`
        : `/plans/${planId}/activate`;
      await api.post(endpoint);
      fetchPlans();
    } catch (err) {
      console.error("Failed to toggle plan active status:", err);
    }
  };

  const columns: Column<PlanDTO>[] = [
    {
      header: "Plan Details",
      cell: (item) => (
        <div>
          <Link
            href={`/admin/plans/${item.id}`}
            className="font-semibold text-brand-600 hover:text-brand-800"
          >
            {item.name}
          </Link>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className="text-[10px] bg-slate-100 font-mono px-1.5 py-0.5 rounded text-slate-600">
              {item.code}
            </span>
            {item.description && (
              <span className="text-xs text-slate-400 truncate max-w-xs">
                {item.description}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Billing Tiers",
      cell: (item) => (
        <div className="space-y-1">
          {item.prices && item.prices.length > 0 ? (
            item.prices.map((p) => (
              <div key={p.id} className="text-xs flex items-center space-x-2">
                <span className="font-semibold text-slate-900">
                  <MoneyDisplay amountMinor={p.amountMinor} currency={p.currency} />
                </span>
                <span className="text-[11px] text-slate-500 uppercase font-mono">
                  / {p.intervalCount > 1 ? `${p.intervalCount} ` : ""}{p.billingInterval.toLowerCase()}
                </span>
              </div>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">No price tiers</span>
          )}
        </div>
      ),
    },
    {
      header: "Included Products",
      cell: (item) => (
        <div className="text-xs text-slate-600">
          {item.items && item.items.length > 0 ? (
            item.items.map((it, idx) => (
              <div key={idx} className="truncate max-w-xs">
                • {it.product?.name || "Product"}
                {it.productVariant ? ` (${it.productVariant.name})` : ""}
              </div>
            ))
          ) : (
            <span className="text-slate-400 italic">0 items</span>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      cell: (item) => <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />,
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
            href={`/admin/plans/${item.id}`}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded bg-slate-50 border border-slate-200"
          >
            Edit
          </Link>
          <button
            onClick={() => togglePlanStatus(item.id, item.isActive)}
            className={`text-xs font-semibold px-2.5 py-1 rounded border transition ${
              item.isActive
                ? "text-red-600 border-red-200 hover:bg-red-50"
                : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            {item.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Plan Management"
        description="Configure recurring subscription plans, interval frequencies, and product bundles"
      >
        <Link
          href="/admin/plans/new"
          className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Plan
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
            placeholder="Search plans by name or code..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500 text-slate-900"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={plans}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />
    </DashboardShell>
  );
}
