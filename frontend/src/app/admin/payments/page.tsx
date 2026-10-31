"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { api } from "@/lib/api-client";
import { PaymentDTO, PaymentMethod, PaymentStatus } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { CreditCard, Plus, Search, Eye, Building } from "lucide-react";

export default function PaymentsListPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { pageSize: 50 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (methodFilter !== "all") params.paymentMethod = methodFilter;

      const res = await api.get<any[]>("/payments", params);
      if (res.success && res.data) {
        setPayments(res.data);
      }
    } catch (err) {
      console.error("Failed to load payments ledger:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, methodFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const columns: Column<any>[] = [
    {
      header: "Payment Reference",
      cell: (item) => (
        <div>
          <Link
            href={`/admin/payments/${item.id}`}
            className="font-mono font-medium text-[#172033] hover:text-[#315CF5] block"
          >
            {item.paymentReference}
          </Link>
          {item.notes && (
            <p className="text-[11px] text-[#64748B] truncate max-w-xs mt-0.5">{item.notes}</p>
          )}
        </div>
      ),
    },
    {
      header: "Customer",
      cell: (item) => (
        <div className="min-w-0 max-w-[200px]">
          <p className="font-medium text-[#172033] truncate">
            {item.customer?.fullName || "Customer"}
          </p>
          {item.customer?.companyName && (
            <p className="text-[11px] text-[#64748B] truncate">{item.customer.companyName}</p>
          )}
        </div>
      ),
    },
    {
      header: "Amount",
      align: "right",
      cell: (item) => (
        <div className="font-mono font-medium text-[#16865B]">
          <MoneyDisplay amountMinor={item.amountMinor} currency={item.currency} />
        </div>
      ),
    },
    {
      header: "Method",
      cell: (item) => (
        <span className="text-[11px] font-mono uppercase bg-[#F8FAFC] text-[#64748B] px-2 py-0.5 rounded-[4px] border border-[#E5EAF1]">
          {item.paymentMethod}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: "Payment Date",
      cell: (item) => (
        <span className="text-[12px] font-mono text-[#64748B]">
          {item.paidAt ? formatDate(item.paidAt) : formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      cell: (item) => (
        <Link
          href={`/admin/payments/${item.id}`}
          className="p-1.5 text-[#64748B] hover:text-[#315CF5] hover:bg-[#EFF4FE] rounded-[6px] transition inline-block"
          title="View Allocations"
        >
          <Eye className="w-3.5 h-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Payments Ledger"
        description="Settled client receipts, gateway transactions and unallocated customer credits."
        badge={
          <span className="px-2 py-0.5 rounded-[5px] bg-[#F1F5F9] border border-[#E5EAF1] text-[11px] font-medium text-[#64748B]">
            {payments.length} Records
          </span>
        }
      >
        <Link
          href="/admin/payments/new"
          className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] bg-[#315CF5] text-white hover:bg-[#2549D8] shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Record Payment
        </Link>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-[10px] border border-[#E5EAF1] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search reference or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-[#F8FAFC] border border-[#E5EAF1] rounded-[8px] focus:bg-white focus:outline-hidden focus:border-[#315CF5] text-[#172033] transition"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
          >
            <option value="all">All Methods</option>
            <option value={PaymentMethod.UPI}>UPI</option>
            <option value={PaymentMethod.CARD}>Card</option>
            <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
            <option value={PaymentMethod.CASH}>Cash</option>
            <option value={PaymentMethod.OTHER}>Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
          >
            <option value="all">All Statuses</option>
            <option value={PaymentStatus.COMPLETED}>Completed</option>
            <option value={PaymentStatus.PENDING}>Pending</option>
            <option value={PaymentStatus.FAILED}>Failed</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        emptyTitle="No payments recorded"
        emptyDescription="Record manual offline payments or wait for gateway collections to register."
      />
    </DashboardShell>
  );
}
