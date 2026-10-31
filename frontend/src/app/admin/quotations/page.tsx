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
import { QuotationWithDetailsDTO, PaginationMeta, QuotationStatus } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Plus, Search, FileText, ArrowRight, CheckCircle2, XCircle, Send, LayoutTemplate } from "lucide-react";

export default function AdminQuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationWithDetailsDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Action Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    action: async () => {},
  });

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<QuotationWithDetailsDTO[]>("/quotations", {
        page,
        pageSize: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      if (res.success && res.data) {
        setQuotations(res.data);
        setPagination(res.meta);
      }
    } catch (err) {
      console.error("Failed to load quotations:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleAction = async (quotationId: string, actionType: "send" | "accept" | "reject" | "expire" | "convert") => {
    try {
      if (actionType === "convert") {
        await api.post(`/quotations/${quotationId}/convert`, { billingInterval: "MONTHLY" });
      } else {
        await api.post(`/quotations/${quotationId}/${actionType}`);
      }
      fetchQuotations();
    } catch (err: any) {
      alert(err.message || `Failed to ${actionType} quotation`);
    }
  };

  const columns: Column<QuotationWithDetailsDTO>[] = [
    {
      header: "Quotation #",
      cell: (item) => (
        <div>
          <Link
            href={`/admin/quotations/${item.id}`}
            className="font-semibold text-brand-600 hover:text-brand-800 flex items-center space-x-1"
          >
            <span>{item.quotationNumber}</span>
          </Link>
          <span className="text-xs text-slate-400 font-mono">
            {formatDate(item.createdAt)}
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
      header: "Valid Until",
      cell: (item) => (
        <span className="text-xs font-mono text-slate-600">
          {formatDate(item.validUntil)}
        </span>
      ),
    },
    {
      header: "Total Amount",
      cell: (item) => (
        <div className="font-semibold text-slate-900">
          <MoneyDisplay amountMinor={item.totalAmountMinor} currency={item.currency} />
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
          {item.status === QuotationStatus.DRAFT && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Send Quotation",
                  description: `Mark quotation ${item.quotationNumber} as SENT to customer?`,
                  action: () => handleAction(item.id, "send"),
                })
              }
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
            >
              <Send className="w-3 h-3 mr-1" />
              Send
            </button>
          )}

          {item.status === QuotationStatus.SENT && (
            <>
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: "Accept Quotation",
                    description: `Record acceptance of quotation ${item.quotationNumber}?`,
                    action: () => handleAction(item.id, "accept"),
                  })
                }
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Accept
              </button>
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: "Reject Quotation",
                    description: `Record rejection for quotation ${item.quotationNumber}?`,
                    action: () => handleAction(item.id, "reject"),
                  })
                }
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
              >
                <XCircle className="w-3 h-3 mr-1" />
                Reject
              </button>
            </>
          )}

          {item.status === QuotationStatus.ACCEPTED && !item.subscription && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Convert to Subscription",
                  description: `Convert accepted quotation ${item.quotationNumber} into an active monthly recurring subscription?`,
                  action: () => handleAction(item.id, "convert"),
                })
              }
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
            >
              <ArrowRight className="w-3 h-3 mr-1" />
              Convert
            </button>
          )}

          <Link
            href={`/admin/quotations/${item.id}`}
            className="text-xs text-slate-500 hover:text-slate-800 underline font-medium ml-2"
          >
            Details
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Quotations"
        description="Manage commercial quotations, customer acceptance, and conversion to active subscriptions."
      >
        <div className="flex items-center space-x-2">
          <Link
            href="/admin/quotation-templates"
            className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
          >
            <LayoutTemplate className="w-4 h-4 mr-2 text-slate-500" />
            Templates
          </Link>
          <Link
            href="/admin/quotations/new"
            className="inline-flex items-center px-3.5 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Quotation
          </Link>
        </div>
      </PageHeader>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search quotation # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={quotations}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </DashboardShell>
  );
}
