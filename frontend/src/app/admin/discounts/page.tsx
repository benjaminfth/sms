"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { DiscountDTO, DiscountType } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Percent, Plus, Search, Tag, Edit, ShieldAlert } from "lucide-react";

export default function DiscountsListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [discounts, setDiscounts] = useState<DiscountDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { pageSize: 50 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.isActive = statusFilter === "active";
      if (typeFilter !== "all") params.discountType = typeFilter;

      const res = await api.get<DiscountDTO[]>("/discounts", params);
      if (res.success && res.data) {
        setDiscounts(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch discounts:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const columns: Column<DiscountDTO>[] = [
    {
      header: "Promo Code & Name",
      cell: (item) => (
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono font-medium text-[#172033]">{item.code}</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-[4px] bg-[#F1F5F9] text-[#64748B] border border-[#E5EAF1]">
              {item.scope}
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] truncate mt-0.5">{item.name}</p>
        </div>
      ),
    },
    {
      header: "Discount Value",
      align: "right",
      cell: (item) => {
        const isPct = item.discountType === DiscountType.PERCENTAGE;
        return (
          <span className="font-mono font-medium text-[#16865B]">
            {isPct
              ? `${(Number(item.valueMinorOrBasisPoints) / 100).toFixed(1)}%`
              : `₹${(Number(item.valueMinorOrBasisPoints) / 100).toLocaleString("en-IN")}`}
          </span>
        );
      },
    },
    {
      header: "Type",
      cell: (item) => (
        <span className="text-[11px] font-mono text-[#64748B] uppercase">
          {item.discountType.replace("_", " ")}
        </span>
      ),
    },
    {
      header: "Redemptions",
      cell: (item) => (
        <span className="text-[12px] font-mono text-[#172033]">
          {item.currentRedemptions} / {item.maxRedemptions || "∞"}
        </span>
      ),
    },
    {
      header: "Validity",
      cell: (item) => (
        <span className="text-[11px] font-mono text-[#64748B]">
          {item.endDate ? `Until ${formatDate(item.endDate)}` : "Ongoing"}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (item) => <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      header: "Actions",
      align: "right",
      cell: (item) => (
        <Link
          href={`/admin/discounts/${item.id}`}
          className="p-1.5 text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] rounded-[6px] transition inline-block"
          title="Configure Discount"
        >
          <Edit className="w-3.5 h-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Discounts & Promos"
        description="Configure percentage codes, fixed coupons and subscription redemption rules."
        badge={
          <span className="px-2 py-0.5 rounded-[5px] bg-[#F1F5F9] border border-[#E5EAF1] text-[11px] font-medium text-[#64748B]">
            {discounts.length} Active Codes
          </span>
        }
      >
        {isAdmin && (
          <Link
            href="/admin/discounts/new"
            className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] bg-[#315CF5] text-white hover:bg-[#2549D8] shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Discount
          </Link>
        )}
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-[10px] border border-[#E5EAF1] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search code or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-[#F8FAFC] border border-[#E5EAF1] rounded-[8px] focus:bg-white focus:outline-hidden focus:border-[#315CF5] text-[#172033] transition"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
          >
            <option value="all">All Types</option>
            <option value={DiscountType.PERCENTAGE}>Percentage</option>
            <option value={DiscountType.FIXED_AMOUNT}>Fixed Amount</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={discounts}
        loading={loading}
        emptyTitle="No discounts configured"
        emptyDescription="Create percentage codes or fixed amount discounts to apply to quotations or checkouts."
      />
    </DashboardShell>
  );
}
