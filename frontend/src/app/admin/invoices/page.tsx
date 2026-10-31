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
            className="font-medium text-[#172033] hover:text-[#315CF5] font-mono block"
          >
            {item.invoiceNumber}
          </Link>
          <span className="text-[11px] text-[#64748B] font-mono">
            Issued: {formatDate(item.createdAt)}
          </span>
        </div>
      ),
    },
    {
      header: "Customer",
      cell: (item) => (
        <div className="min-w-0 max-w-[200px]">
          <p className="font-medium text-[#172033] truncate">{item.customer?.fullName || "—"}</p>
          {item.customer?.companyName && (
            <p className="text-[11px] text-[#64748B] truncate">{item.customer.companyName}</p>
          )}
        </div>
      ),
    },
    {
      header: "Due Date",
      cell: (item) => (
        <span className="text-[12px] font-mono text-[#64748B]">
          {formatDate(item.dueDate)}
        </span>
      ),
    },
    {
      header: "Total",
      align: "right",
      cell: (item) => (
        <div className="font-mono font-medium text-[#172033]">
          <MoneyDisplay amountMinor={item.totalAmountMinor} currency={item.currency} />
        </div>
      ),
    },
    {
      header: "Amount Paid",
      align: "right",
      cell: (item) => (
        <div className="font-mono text-[#16865B] text-[12px] font-medium">
          <MoneyDisplay amountMinor={item.amountPaidMinor} currency={item.currency} />
        </div>
      ),
    },
    {
      header: "Balance Due",
      align: "right",
      cell: (item) => (
        <div className="font-mono font-semibold text-[12px] text-[#172033]">
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
      align: "right",
      cell: (item) => (
        <div className="flex items-center justify-end space-x-1.5">
          <Link
            href={`/admin/invoices/${item.id}/print`}
            target="_blank"
            className="p-1.5 text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] rounded-[6px] transition"
            title="Print PDF Document"
          >
            <Printer className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/admin/invoices/${item.id}`}
            className="p-1.5 text-[#64748B] hover:text-[#315CF5] hover:bg-[#EFF4FE] rounded-[6px] transition"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Invoices"
        description="Authoritative recurring billing statements, tax assessments and collection ledger."
        badge={
          pagination ? (
            <span className="px-2 py-0.5 rounded-[5px] bg-[#F1F5F9] border border-[#E5EAF1] text-[11px] font-medium text-[#64748B]">
              {pagination.total} Total
            </span>
          ) : undefined
        }
      />

      {/* Filters Bar */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-[10px] border border-[#E5EAF1] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-[#F8FAFC] border border-[#E5EAF1] rounded-[8px] focus:bg-white focus:outline-hidden focus:border-[#315CF5] text-[#172033] transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
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

      <DataTable
        columns={columns}
        data={invoices}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
        emptyTitle="No invoices found"
        emptyDescription="Invoices generated by billing automation runs or converted quotations will appear here."
      />
    </DashboardShell>
  );
}
