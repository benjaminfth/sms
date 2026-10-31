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
import { PlanDTO, PaginationMeta } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Layers, Edit, CheckCircle2, XCircle } from "lucide-react";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Status toggle confirmation
  const [toggleTarget, setToggleTarget] = useState<{ id: string; name: string; currentStatus: boolean } | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

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

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      const endpoint = toggleTarget.currentStatus
        ? `/plans/${toggleTarget.id}/deactivate`
        : `/plans/${toggleTarget.id}/activate`;
      await api.post(endpoint);
      setToggleTarget(null);
      fetchPlans();
    } catch (err) {
      console.error("Failed to toggle plan status:", err);
    } finally {
      setToggleLoading(false);
    }
  };

  const columns: Column<PlanDTO>[] = [
    {
      header: "Plan & Code",
      cell: (item) => (
        <div className="min-w-0 max-w-xs">
          <div className="flex items-center space-x-2">
            <Link
              href={`/admin/plans/${item.id}`}
              className="font-medium text-[#172033] hover:text-[#315CF5] truncate block"
            >
              {item.name}
            </Link>
            <span className="text-[10px] bg-[#F1F5F9] font-mono px-1.5 py-0.5 rounded-[4px] text-[#64748B] border border-[#E5EAF1] shrink-0">
              {item.code}
            </span>
          </div>
          {item.description && (
            <p className="text-[11px] text-[#64748B] truncate mt-0.5">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      header: "Billing Tiers",
      cell: (item) => (
        <div className="space-y-1">
          {item.prices && item.prices.length > 0 ? (
            item.prices.map((p) => (
              <div key={p.id} className="text-[12px] flex items-center space-x-1.5">
                <span className="font-mono font-medium text-[#172033]">
                  <MoneyDisplay amountMinor={p.amountMinor} currency={p.currency} />
                </span>
                <span className="text-[11px] text-[#64748B] lowercase font-mono">
                  / {p.intervalCount > 1 ? `${p.intervalCount} ` : ""}{p.billingInterval.toLowerCase()}
                </span>
              </div>
            ))
          ) : (
            <span className="text-[12px] text-[#94A3B8] italic">No prices</span>
          )}
        </div>
      ),
    },
    {
      header: "Included Products",
      cell: (item) => (
        <div className="text-[12px] text-[#172033]">
          {item.items && item.items.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {item.items.map((it, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-[#F8FAFC] border border-[#E5EAF1] text-[11px]"
                >
                  {it.product?.name || "Product"}
                  {it.productVariant ? ` (${it.productVariant.name})` : ""}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[#94A3B8] italic">0 items</span>
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
      cell: (item) => (
        <span className="text-[12px] font-mono text-[#64748B]">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      cell: (item) => (
        <div className="flex items-center justify-end space-x-1.5">
          <Link
            href={`/admin/plans/${item.id}`}
            className="p-1.5 text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] rounded-[6px] transition"
            title="Edit Plan"
          >
            <Edit className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() =>
              setToggleTarget({ id: item.id, name: item.name, currentStatus: item.isActive })
            }
            className={`text-[11px] font-medium px-2 py-0.5 rounded-[5px] border transition ${
              item.isActive
                ? "text-[#D14343] border-[#F8C6C6] hover:bg-[#FDEDED]"
                : "text-[#16865B] border-[#C7E8D8] hover:bg-[#EDF7F2]"
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
        title="Plans"
        description="Configure recurring subscription tiers, billing intervals and bundled software products."
        badge={
          pagination ? (
            <span className="px-2 py-0.5 rounded-[5px] bg-[#F1F5F9] border border-[#E5EAF1] text-[11px] font-medium text-[#64748B]">
              {pagination.total} Total
            </span>
          ) : undefined
        }
      >
        <Link
          href="/admin/plans/new"
          className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] bg-[#315CF5] text-white hover:bg-[#2549D8] shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Plan
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
            placeholder="Search plans by name or code..."
            className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-[#F8FAFC] border border-[#E5EAF1] rounded-[8px] focus:bg-white focus:outline-hidden focus:border-[#315CF5] text-[#172033] transition"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={plans}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
        emptyTitle="No plans found"
        emptyDescription="Create subscription plans to begin offering recurring services."
      />

      {/* Status Toggle Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!toggleTarget}
        title={toggleTarget?.currentStatus ? "Deactivate Plan" : "Activate Plan"}
        description={
          toggleTarget?.currentStatus
            ? `Are you sure you want to deactivate "${toggleTarget?.name}"? New subscriptions won't be able to select it.`
            : `Are you sure you want to activate "${toggleTarget?.name}" for sales?`
        }
        confirmLabel={toggleTarget?.currentStatus ? "Deactivate" : "Activate"}
        variant={toggleTarget?.currentStatus ? "danger" : "primary"}
        loading={toggleLoading}
        onConfirm={handleToggleConfirm}
        onCancel={() => setToggleTarget(null)}
      />
    </DashboardShell>
  );
}
