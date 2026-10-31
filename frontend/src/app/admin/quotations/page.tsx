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
import { Plus, Search, FileText, ArrowRight, CheckCircle2, XCircle, Send, Eye } from "lucide-react";

export default function AdminQuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationWithDetailsDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const handleAction = async (
    quotationId: string,
    actionType: "send" | "accept" | "reject" | "expire" | "convert"
  ) => {
    setActionError(null);
    try {
      if (actionType === "convert") {
        await api.post(`/quotations/${quotationId}/convert`, { billingInterval: "MONTHLY" });
      } else {
        await api.post(`/quotations/${quotationId}/${actionType}`);
      }
      fetchQuotations();
    } catch (err: any) {
      setActionError(err.message || `Failed to perform ${actionType} action.`);
    }
  };

  const columns: Column<QuotationWithDetailsDTO>[] = [
    {
      header: "Quotation #",
      cell: (item) => (
        <div>
          <Link
            href={`/admin/quotations/${item.id}`}
            className="font-medium text-[#172033] hover:text-[#315CF5] font-mono block"
          >
            {item.quotationNumber}
          </Link>
          <span className="text-[11px] text-[#64748B] font-mono">
            {formatDate(item.createdAt)}
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
      header: "Valid Until",
      cell: (item) => (
        <span className="text-[12px] font-mono text-[#64748B]">
          {formatDate(item.validUntil)}
        </span>
      ),
    },
    {
      header: "Total Amount",
      align: "right",
      cell: (item) => (
        <div className="font-mono font-medium text-[#172033]">
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
      align: "right",
      cell: (item) => (
        <div className="flex items-center justify-end space-x-1.5">
          <Link
            href={`/admin/quotations/${item.id}`}
            className="p-1.5 text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] rounded-[6px] transition"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>

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
              className="px-2 py-0.5 text-[11px] font-medium rounded-[5px] text-[#3978C8] bg-[#EEF4FC] hover:bg-[#C8DEF6] border border-[#C8DEF6] transition"
            >
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
                    description: `Record client acceptance for quotation ${item.quotationNumber}?`,
                    action: () => handleAction(item.id, "accept"),
                  })
                }
                className="px-2 py-0.5 text-[11px] font-medium rounded-[5px] text-[#16865B] bg-[#EDF7F2] hover:bg-[#C7E8D8] border border-[#C7E8D8] transition"
              >
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
                className="px-2 py-0.5 text-[11px] font-medium rounded-[5px] text-[#D14343] bg-[#FDEDED] hover:bg-[#F8C6C6] border border-[#F8C6C6] transition"
              >
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
                  description: `Convert quotation ${item.quotationNumber} into an active recurring subscription?`,
                  action: () => handleAction(item.id, "convert"),
                })
              }
              className="px-2.5 py-0.5 text-[11px] font-medium rounded-[5px] text-white bg-[#315CF5] hover:bg-[#2549D8] transition shadow-xs"
            >
              Convert to Sub
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Quotations"
        description="Formal enterprise proposals, line-item pricing breakdowns and subscription conversions."
        badge={
          pagination ? (
            <span className="px-2 py-0.5 rounded-[5px] bg-[#F1F5F9] border border-[#E5EAF1] text-[11px] font-medium text-[#64748B]">
              {pagination.total} Total
            </span>
          ) : undefined
        }
      >
        <Link
          href="/admin/quotations/new"
          className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] bg-[#315CF5] text-white hover:bg-[#2549D8] shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Quotation
        </Link>
      </PageHeader>

      {actionError && (
        <div className="mb-4 p-3 bg-[#FDEDED] text-[#D14343] border border-[#F8C6C6] rounded-[8px] text-[12px] font-medium">
          {actionError}
        </div>
      )}

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
            placeholder="Search by quote # or customer..."
            className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-[#F8FAFC] border border-[#E5EAF1] rounded-[8px] focus:bg-white focus:outline-hidden focus:border-[#315CF5] text-[#172033] transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-auto px-3 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={quotations}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
        emptyTitle="No quotations found"
        emptyDescription="Create commercial quotations and proposal estimates for client onboarding."
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={async () => {
          await confirmDialog.action();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </DashboardShell>
  );
}
