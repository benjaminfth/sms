"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/api-client";
import { BillingRunDTO, BillingAttemptDTO } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import {
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  X,
  History,
  Clock,
  Layers,
} from "lucide-react";

export default function AdminBillingPage() {
  const [runs, setRuns] = useState<BillingRunDTO[]>([]);
  const [attempts, setAttempts] = useState<BillingAttemptDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBilling, setRunningBilling] = useState(false);
  const [lastResult, setLastResult] = useState<any | null>(null);

  // Run modal state
  const [showRunModal, setShowRunModal] = useState(false);
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [runsRes, attemptsRes] = await Promise.all([
        api.get<BillingRunDTO[]>("/billing/runs", { pageSize: 10 }),
        api.get<BillingAttemptDTO[]>("/billing/attempts", { pageSize: 15 }),
      ]);
      if (runsRes.data) setRuns(runsRes.data);
      if (attemptsRes.data) setAttempts(attemptsRes.data);
    } catch (err) {
      console.error("Failed to load billing history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExecuteBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunningBilling(true);
    try {
      const res = await api.post<any>("/billing/run", {
        targetDate: new Date(`${targetDate}T23:59:59.000Z`).toISOString(),
      });
      if (res.success && res.data) {
        setLastResult(res.data);
        setShowRunModal(false);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to execute billing run:", err);
    } finally {
      setRunningBilling(false);
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Automated Billing Engine"
        description="Monitor automated recurring billing runs, advance subscription cycles, and audit invoice generation"
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchData}
              className="inline-flex items-center px-3 py-1.5 rounded-btn border border-border bg-surface-card hover:bg-surface-canvas text-[13px] font-medium text-text-primary transition-colors shadow-xs"
            >
              <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowRunModal(true)}
              className="inline-flex items-center px-3.5 py-1.5 rounded-btn bg-primary-accent hover:bg-primary-hover text-[13px] font-medium text-white transition-colors shadow-xs"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Execute Billing Run
            </button>
          </div>
        }
      />

      {lastResult && (
        <div className="mb-6 p-4 rounded-card bg-surface-card border border-border shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-status-success/15 text-status-success flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-[14px] font-semibold text-text-primary">
                  Billing Execution Completed
                </h4>
                <p className="text-[12px] text-text-secondary mt-0.5">
                  Processed {lastResult.processedSubscriptionsCount || 0} subscriptions • Generated {lastResult.successfulInvoicesCount || 0} invoices ({lastResult.failedInvoicesCount || 0} failed)
                </p>
              </div>
            </div>
            <button
              onClick={() => setLastResult(null)}
              className="text-text-muted hover:text-text-primary p-1 rounded-btn hover:bg-surface-canvas"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Execution Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-card p-4 rounded-card border border-border shadow-xs">
          <div className="text-[12px] font-medium text-text-secondary">Total Runs Logged</div>
          <div className="text-[24px] font-semibold text-text-primary tracking-tight mt-1">
            {runs.length}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Automated and manual execution batches</div>
        </div>

        <div className="bg-surface-card p-4 rounded-card border border-border shadow-xs">
          <div className="text-[12px] font-medium text-text-secondary">Successful Invoices In Log</div>
          <div className="text-[24px] font-semibold text-status-success tracking-tight mt-1">
            {runs.reduce((acc, r) => acc + (r.successfulInvoicesCount || 0), 0)}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Generated across recorded cycles</div>
        </div>

        <div className="bg-surface-card p-4 rounded-card border border-border shadow-xs">
          <div className="text-[12px] font-medium text-text-secondary">Recent Audit Attempts</div>
          <div className="text-[24px] font-semibold text-text-primary tracking-tight mt-1">
            {attempts.length}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Detailed subscription generation traces</div>
        </div>
      </div>

      {/* Execution History Table */}
      <div className="bg-surface-card rounded-card border border-border shadow-xs overflow-hidden mb-8">
        <div className="p-4 border-b border-border bg-surface-canvas flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-text-secondary" />
            <h3 className="text-[13px] font-semibold text-text-primary">Billing Run History</h3>
          </div>
          <span className="text-[12px] text-text-muted font-mono">{runs.length} cycles</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] font-medium text-text-muted uppercase tracking-wider bg-surface-canvas/50">
                <th className="py-2.5 px-4">Run Timestamp</th>
                <th className="py-2.5 px-4">Target Date</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Processed</th>
                <th className="py-2.5 px-4 text-right">Invoices Created</th>
                <th className="py-2.5 px-4 text-right">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-surface-canvas/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-[12px] text-text-primary">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="py-3 px-4 font-mono text-[12px] text-text-secondary">
                    {formatDate(r.targetDate)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-text-secondary">
                    {r.processedSubscriptionsCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-status-success">
                    {r.successfulInvoicesCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-status-danger">
                    {r.failedInvoicesCount}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted text-[13px]">
                    No billing runs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-surface-card rounded-card border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-canvas flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-text-secondary" />
            <h3 className="text-[13px] font-semibold text-text-primary">
              Subscription Billing Attempts Audit Log
            </h3>
          </div>
          <span className="text-[12px] text-text-muted font-mono">{attempts.length} attempts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] font-medium text-text-muted uppercase tracking-wider bg-surface-canvas/50">
                <th className="py-2.5 px-4">Attempt Timestamp</th>
                <th className="py-2.5 px-4">Subscription</th>
                <th className="py-2.5 px-4">Outcome</th>
                <th className="py-2.5 px-4">Generated Invoice</th>
                <th className="py-2.5 px-4">Details / Diagnostics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attempts.map((att) => (
                <tr key={att.id} className="hover:bg-surface-canvas/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-[12px] text-text-secondary">
                    {formatDate(att.attemptedAt)}
                  </td>
                  <td className="py-3 px-4 font-mono text-[12px] font-medium text-primary-accent">
                    <Link
                      href={`/admin/subscriptions/${att.subscriptionId}`}
                      className="hover:underline"
                    >
                      {att.subscription?.subscriptionNumber || att.subscriptionId.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={att.status} />
                  </td>
                  <td className="py-3 px-4 font-mono text-[12px]">
                    {att.invoiceId ? (
                      <Link
                        href={`/admin/invoices/${att.invoiceId}`}
                        className="text-primary-accent hover:underline font-medium"
                      >
                        {att.invoice?.invoiceNumber || "View Invoice"}
                      </Link>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[12px] text-text-secondary">
                    {att.errorMessage || "Billing successfully executed"}
                  </td>
                </tr>
              ))}
              {attempts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-muted text-[13px]">
                    No billing attempts recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trigger Billing Run Modal */}
      {showRunModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRunModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <div className="bg-surface-card rounded-dialog shadow-xl w-full max-w-md p-6 border border-border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-primary-accent" />
                <h3 className="text-[15px] font-semibold text-text-primary">
                  Execute Billing Run
                </h3>
              </div>
              <button
                onClick={() => setShowRunModal(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-btn hover:bg-surface-canvas"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteBilling} className="space-y-4">
              <p className="text-[12px] text-text-secondary leading-relaxed">
                The billing engine scans all active subscriptions due on or before the selected target date, generates invoices, and advances their billing periods. Subscriptions already invoiced for this period will be safely skipped.
              </p>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                  Billing Target Date
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full border border-border rounded-input px-3.5 py-2 text-[13px] bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
                />
                <span className="text-[11px] text-text-muted block mt-1">
                  Subscriptions with next billing date on or before this date will be invoiced.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowRunModal(false)}
                  className="px-4 py-2 text-[12px] font-medium text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={runningBilling}
                  className="inline-flex items-center px-4 py-2 text-[12px] font-medium rounded-btn text-white bg-primary-accent hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                  {runningBilling ? "Processing..." : "Run Billing Cycle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
