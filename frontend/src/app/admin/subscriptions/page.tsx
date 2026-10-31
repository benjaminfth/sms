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
import { SubscriptionWithDetailsDTO, PaginationMeta, SubscriptionStatus } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Repeat, Play, Pause, XCircle, Eye } from "lucide-react";

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithDetailsDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Confirm dialog state
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

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<SubscriptionWithDetailsDTO[]>("/subscriptions", {
        page,
        pageSize: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      if (res.success && res.data) {
        setSubscriptions(res.data);
        setPagination(res.meta);
      }
    } catch (err) {
      console.error("Failed to load subscriptions:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleAction = async (id: string, actionType: "activate" | "pause" | "resume" | "cancel") => {
    setActionError(null);
    try {
      await api.post(`/subscriptions/${id}/${actionType}`);
      fetchSubscriptions();
    } catch (err: any) {
      setActionError(err.message || `Failed to ${actionType} subscription.`);
    }
  };

  const calculateTotalAmount = (item: SubscriptionWithDetailsDTO) => {
    return item.items.reduce((acc, it) => {
      const qtyNum = parseFloat(it.quantity) || 1.0;
      const unit = BigInt(it.unitPriceMinor || "0");
      const qtyBasis = BigInt(Math.round(qtyNum * 1000));
      return acc + (unit * qtyBasis) / BigInt(1000);
    }, BigInt(0));
  };

  const columns: Column<SubscriptionWithDetailsDTO>[] = [
    {
      header: "Subscription #",
      cell: (item) => (
        <div>
          <Link
            href={`/admin/subscriptions/${item.id}`}
            className="font-medium text-[#172033] hover:text-[#315CF5] font-mono block"
          >
            {item.subscriptionNumber}
          </Link>
          <span className="text-[11px] text-[#64748B] font-mono">
            Started: {formatDate(item.createdAt)}
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
      header: "Interval",
      cell: (item) => (
        <span className="text-[11px] font-mono uppercase bg-[#F8FAFC] text-[#64748B] px-2 py-0.5 rounded-[4px] border border-[#E5EAF1]">
          {item.intervalCount > 1 ? `${item.intervalCount} ` : ""}{item.billingInterval}
        </span>
      ),
    },
    {
      header: "Current Period",
      cell: (item) => (
        <div className="text-[12px] text-[#64748B] font-mono">
          <span>{formatDate(item.currentPeriodStart)}</span>
          <span className="mx-1 text-[#CBD5E1]">→</span>
          <span>{formatDate(item.currentPeriodEnd)}</span>
        </div>
      ),
    },
    {
      header: "Next Billing",
      cell: (item) => (
        <span className="text-[12px] font-mono text-[#172033]">
          {formatDate(item.nextBillingDate)}
        </span>
      ),
    },
    {
      header: "Recurring Total",
      align: "right",
      cell: (item) => (
        <div className="font-mono font-medium text-[#172033]">
          <MoneyDisplay
            amountMinor={calculateTotalAmount(item).toString()}
            currency={item.currency}
          />
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
            href={`/admin/subscriptions/${item.id}`}
            className="p-1.5 text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] rounded-[6px] transition"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>

          {item.status === SubscriptionStatus.ACTIVE && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Pause Subscription",
                  description: `Pause subscription ${item.subscriptionNumber}? Paused subscriptions will pause automated recurring billing runs.`,
                  action: () => handleAction(item.id, "pause"),
                })
              }
              className="px-2 py-0.5 text-[11px] font-medium rounded-[5px] text-[#C58A24] bg-[#FDF8ED] hover:bg-[#F6E2B8] border border-[#F6E2B8] transition"
            >
              Pause
            </button>
          )}

          {item.status === SubscriptionStatus.PAUSED && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Resume Subscription",
                  description: `Resume recurring billing for subscription ${item.subscriptionNumber}?`,
                  action: () => handleAction(item.id, "resume"),
                })
              }
              className="px-2 py-0.5 text-[11px] font-medium rounded-[5px] text-[#16865B] bg-[#EDF7F2] hover:bg-[#C7E8D8] border border-[#C7E8D8] transition"
            >
              Resume
            </button>
          )}

          {item.status !== SubscriptionStatus.CANCELLED && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Cancel Subscription",
                  description: `Cancel subscription ${item.subscriptionNumber}? It will cease generating future invoices.`,
                  action: () => handleAction(item.id, "cancel"),
                })
              }
              className="px-2 py-0.5 text-[11px] font-medium rounded-[5px] text-[#D14343] bg-[#FDEDED] hover:bg-[#F8C6C6] border border-[#F8C6C6] transition"
            >
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Subscriptions"
        description="Active recurring customer contracts, billing cycles and renewal state machines."
        badge={
          pagination ? (
            <span className="px-2 py-0.5 rounded-[5px] bg-[#F1F5F9] border border-[#E5EAF1] text-[11px] font-medium text-[#64748B]">
              {pagination.total} Total
            </span>
          ) : undefined
        }
      >
        <Link
          href="/admin/subscriptions/new"
          className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] bg-[#315CF5] text-white hover:bg-[#2549D8] shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Subscription
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
            placeholder="Search by subscription # or customer..."
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
          <option value="ACTIVE">Active</option>
          <option value="TRIALING">Trialing</option>
          <option value="PAST_DUE">Past Due</option>
          <option value="PAUSED">Paused</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={subscriptions}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
        emptyTitle="No subscriptions found"
        emptyDescription="Create or convert approved quotations to establish recurring contracts."
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
