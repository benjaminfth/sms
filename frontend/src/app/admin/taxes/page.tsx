"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { TaxDTO } from "@sms/shared";
import {
  Landmark,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Package,
  Calendar,
} from "lucide-react";

export default function TaxesListPage() {
  const [taxes, setTaxes] = useState<TaxDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchTaxes = async () => {
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
  };

  useEffect(() => {
    fetchTaxes();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTaxes();
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Tax Management & Configuration"
        description="Configure tax rates, GST components, and product-level tax rules"
      >
        <Link
          href="/admin/taxes/new"
          className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create New Tax
        </Link>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by tax name or code (e.g. GST-18)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Taxes</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Taxes Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading tax catalog...</p>
          </div>
        ) : taxes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Landmark className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No taxes found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No taxes match your current search criteria. Create a new tax rule to apply it to products and invoices.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Tax Name & Code</th>
                  <th className="py-3 px-4">Tax Rate (%)</th>
                  <th className="py-3 px-4">Basis Points</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Products</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {taxes.map((tax) => {
                  const ratePercent = (tax.rateBasisPoints / 100).toFixed(2);
                  const productCount = (tax as any)._count?.productTaxes ?? tax.productTaxes?.length ?? 0;

                  return (
                    <tr key={tax.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{tax.name}</div>
                        <div className="text-[11px] font-mono text-brand-600 font-medium">
                          {tax.code}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          {ratePercent}%
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {tax.rateBasisPoints} bps
                      </td>
                      <td className="py-3 px-4">
                        {tax.isActive ? (
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
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-600">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>{productCount} products</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <div className="flex items-center space-x-1 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(tax.createdAt).toLocaleDateString("en-IN")}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/taxes/${tax.id}`}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Configure
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
