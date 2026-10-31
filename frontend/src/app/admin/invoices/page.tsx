"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { api } from "@/lib/api-client";
import { InvoiceWithDetailsDTO, PaginationMeta, InvoiceStatus } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Search, Receipt, Printer, Eye } from "lucide-react";

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithDetailsDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<InvoiceWithDetailsDTO[]>("/invoices", {
        page,
        pageSize: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      if (res.success && res.data) {
        setInvoices(res.data);
        setPagination(res.meta);
      }
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const columns: Column<InvoiceWithDetailsDTO>[] = [
    {
      header: "Invoice #",
      cell: (item) => (
        <div>
          <Link
            href={`/admin/invoices/${item.id}`}
            className="font-semibold text-brand-600 hover:text-brand-800 font-mono flex items-center space-x-1"
          >
            <span>{item.invoiceNumber}</span>
          </Link>
          <span className="text-[11px] text-slate-400 font-mono">
            Issued: {formatDate(item.createdAt)}
          </span>
        </div>
      ),
    },
    {
      header: "Customer",
      cell: (item) => (
        <div>
          <p className="font-medium text-slate-900">{item.customer?.fullName || "—"}</p>
          {item.customer?.companyName && (
            <p className="text-xs text-slate-500">{item.customer.companyName}</p>
          )}
        </div>
      ),
    },
    {
      header: "Due Date",
      cell: (item) => (
        <span className="text-xs font-mono text-slate-600">
          {formatDate(item.dueDate)}
        </span>
      ),
    },
    {
      header: "Total",
      cell: (item) => (
        <div className="font-semibold text-slate-900 font-mono">
          <MoneyDisplay amountMinor={item.totalAmountMinor} currency={item.currency} />
        </div>
      ),
    },
    {
      header: "Amount Paid",
      cell: (item) => (
        <div className="font-mono text-emerald-700 text-xs font-medium">
          <MoneyDisplay amountMinor={item.amountPaidMinor} currency={item.currency} />
        </div>
      ),
    },
    {
      header: "Balance Due",
      cell: (item) => (
        <div className="font-mono font-semibold text-xs text-slate-900">
          <MoneyDisplay amountMinor={item.balanceDueMinor} currency={item.currency} />
        </div>
      ),
    },
    {
      header: "Status",
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (item) => (
        <div className="flex items-center justify-end space-x-2">
          <Link
            href={`/admin/invoices/${item.id}/print`}
            target="_blank"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
            title="Print Invoice"
          >
            <Printer className="w-4 h-4" />
          </Link>
          <Link
            href={`/admin/invoices/${item.id}`}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
          >
            <Eye className="w-3 h-3 mr-1 text-slate-500" />
            View
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Invoices"
        description="Manage and track billing invoices, payment statuses, and outstanding balances."
      />

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="ISSUED">Issued</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="VOID">Void</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />
    </DashboardShell>
  );
}
