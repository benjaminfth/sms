"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { DiscountDTO, DiscountType } from "@sms/shared";
import {
  Percent,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Tag,
  Edit2,
  Calendar,
  Users,
} from "lucide-react";

export default function DiscountsListPage() {
  const [discounts, setDiscounts] = useState<DiscountDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchDiscounts = async () => {
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
  };

  useEffect(() => {
    fetchDiscounts();
  }, [statusFilter, typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDiscounts();
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Discount & Promotion Management"
        description="Create promotional codes, percentage discounts, and fixed deductions"
      >
        <Link
          href="/admin/discounts/new"
          className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create New Discount
        </Link>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code or name (e.g. LAUNCH20)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </form>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Types</option>
              <option value={DiscountType.PERCENTAGE}>Percentage</option>
              <option value={DiscountType.FIXED_AMOUNT}>Fixed Amount</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Discounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading discounts...</p>
          </div>
        ) : discounts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Percent className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No discounts found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create a new promotional discount to apply on checkout, quotations, or subscriptions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Promo Code & Name</th>
                  <th className="py-3 px-4">Discount Value</th>
                  <th className="py-3 px-4">Discount Type</th>
                  <th className="py-3 px-4">Redemptions</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {discounts.map((disc) => {
                  const isPct = disc.discountType === DiscountType.PERCENTAGE;
                  const displayValue = isPct
                    ? `${(Number(disc.valueMinorOrBasisPoints) / 100).toFixed(1)}%`
                    : `₹${(Number(disc.valueMinorOrBasisPoints) / 100).toLocaleString("en-IN")}`;

                  const maxLabel = disc.maxRedemptions ? `${disc.maxRedemptions}` : "Unlimited";

                  return (
                    <tr key={disc.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Tag className="w-3.5 h-3.5 text-brand-500" />
                          <span className="font-mono font-bold text-slate-900">{disc.code}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{disc.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                          {displayValue}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-medium text-slate-600 capitalize">
                          {disc.discountType.toLowerCase().replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>
                            {disc.currentRedemptions} / {maxLabel}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {disc.endDate ? (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Expires {new Date(disc.endDate).toLocaleDateString("en-IN")}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No expiry</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {disc.isActive ? (
                          <span className="inline-flex items-center text-xs text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-slate-400 font-medium">
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/discounts/${disc.id}`}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
