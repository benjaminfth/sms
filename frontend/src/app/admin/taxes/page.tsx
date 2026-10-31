"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/api-client";
import { TaxDTO } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Landmark, Plus, Search, Edit, Package } from "lucide-react";

export default function TaxesListPage() {
  const [taxes, setTaxes] = useState<TaxDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchTaxes = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { pageSize: 50 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.isActive = statusFilter === "active";

      const res = await api.get<TaxDTO[]>("/taxes", params);
      if (res.success && res.data) {
        setTaxes(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch taxes:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const columns: Column<TaxDTO>[] = [
    {
      header: "Tax Name & Code",
      cell: (item) => (
        <div>
          <span className="font-medium text-[#172033] block">{item.name}</span>
          <span className="text-[11px] font-mono text-[#315CF5]">{item.code}</span>
        </div>
      ),
    },
    {
      header: "Rate (%)",
      align: "right",
      cell: (item) => {
        const ratePercent = (item.rateBasisPoints / 100).toFixed(2);
        return (
          <span className="font-mono font-medium text-[#172033]">
            {ratePercent}%
          </span>
        );
      },
    },
    {
      header: "Basis Points",
      align: "right",
      cell: (item) => (
        <span className="font-mono text-[12px] text-[#64748B]">
          {item.rateBasisPoints} bps
        </span>
      ),
    },
    {
      header: "Status",
      cell: (item) => <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      header: "Assigned Products",
      cell: (item) => {
        const productCount = (item as any)._count?.productTaxes ?? item.productTaxes?.length ?? 0;
        return (
          <div className="flex items-center space-x-1.5 text-[12px] text-[#64748B]">
            <Package className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span>{productCount} products</span>
          </div>
        );
      },
    },
    {
      header: "Created Date",
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
        <Link
          href={`/admin/taxes/${item.id}`}
          className="p-1.5 text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] rounded-[6px] transition inline-block"
          title="Configure Tax Rule"
        >
          <Edit className="w-3.5 h-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Tax Configuration"
        description="Configure GST rules, inclusive/exclusive calculation methods and product tax rates."
        badge={
          <span className="px-2 py-0.5 rounded-[5px] bg-[#F1F5F9] border border-[#E5EAF1] text-[11px] font-medium text-[#64748B]">
            {taxes.length} Rules
          </span>
        }
      >
        <Link
          href="/admin/taxes/new"
          className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] bg-[#315CF5] text-white hover:bg-[#2549D8] shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Create New Tax
        </Link>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-[10px] border border-[#E5EAF1] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by tax name or code (e.g. GST-18)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-[#F8FAFC] border border-[#E5EAF1] rounded-[8px] focus:bg-white focus:outline-hidden focus:border-[#315CF5] text-[#172033] transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-2.5 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
        >
          <option value="all">All Taxes</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={taxes}
        loading={loading}
        emptyTitle="No taxes configured"
        emptyDescription="Define GST rates and tax components to automatically assess invoices."
      />
    </DashboardShell>
  );
}
