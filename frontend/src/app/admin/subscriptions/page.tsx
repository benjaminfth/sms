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
import { Plus, Search, Repeat, Play, Pause, XCircle } from "lucide-react";

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithDetailsDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
    try {
      await api.post(`/subscriptions/${id}/${actionType}`);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.message || `Failed to ${actionType} subscription`);
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
            className="font-semibold text-brand-600 hover:text-brand-800 flex items-center space-x-1"
          >
            <span>{item.subscriptionNumber}</span>
          </Link>
          <span className="text-[11px] text-slate-400 font-mono">
            Started: {formatDate(item.createdAt)}
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
      header: "Billing Interval",
      cell: (item) => (
        <span className="text-xs font-mono uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
          {item.intervalCount > 1 ? `${item.intervalCount} ` : ""}{item.billingInterval}
        </span>
      ),
    },
    {
      header: "Current Period",
      cell: (item) => (
        <div className="text-xs text-slate-600 font-mono">
          <span>{formatDate(item.currentPeriodStart)}</span>
          <span className="mx-1 text-slate-400">→</span>
          <span>{formatDate(item.currentPeriodEnd)}</span>
        </div>
      ),
    },
    {
      header: "Next Billing",
      cell: (item) => (
        <span className="text-xs font-mono font-medium text-slate-800">
          {formatDate(item.nextBillingDate)}
        </span>
      ),
    },
    {
      header: "Recurring Total",
      cell: (item) => (
        <div className="font-semibold text-slate-900 font-mono">
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
      className: "text-right",
      cell: (item) => (
        <div className="flex items-center justify-end space-x-1.5">
          {item.status === SubscriptionStatus.ACTIVE && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Pause Subscription",
                  description: `Pause subscription ${item.subscriptionNumber}? Paused subscriptions will not generate recurring invoices.`,
                  action: () => handleAction(item.id, "pause"),
                })
              }
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
              title="Pause Subscription"
            >
              <Pause className="w-3 h-3 mr-1" />
              Pause
            </button>
          )}

          {item.status === SubscriptionStatus.PAUSED && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Resume Subscription",
                  description: `Resume subscription ${item.subscriptionNumber}?`,
                  action: () => handleAction(item.id, "resume"),
                })
              }
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
              title="Resume Subscription"
            >
              <Play className="w-3 h-3 mr-1" />
              Resume
            </button>
          )}

          {item.status !== SubscriptionStatus.CANCELLED && (
            <button
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Cancel Subscription",
                  description: `Cancel subscription ${item.subscriptionNumber}? Once cancelled, it will not generate future invoices.`,
                  action: () => handleAction(item.id, "cancel"),
                })
              }
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
              title="Cancel Subscription"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Cancel
            </button>
          )}

          <Link
            href={`/admin/subscriptions/${item.id}`}
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
        title="Subscriptions"
        description="Manage recurring customer subscriptions, billing periods, and lifecycle states."
      >
        <Link
          href="/admin/subscriptions/new"
          className="inline-flex items-center px-3.5 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Subscription
        </Link>
      </PageHeader>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search subscription # or customer..."
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
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="TRIALING">Trialing</option>
            <option value="PAST_DUE">Past Due</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={subscriptions}
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
