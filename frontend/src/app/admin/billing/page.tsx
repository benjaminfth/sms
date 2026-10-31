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
    } catch (err: any) {
      alert(err.message || "Failed to execute billing run");
    } finally {
      setRunningBilling(false);
    }
  };

  const latestRun = runs[0];

  return (
    <DashboardShell>
      <PageHeader
        title="Recurring Billing Engine"
        description="Automated subscription billing cycle execution, invoice generation, and idempotency protection."
      >
        <button
          onClick={() => setShowRunModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
        >
          <Play className="w-4 h-4 mr-2" />
          Run Billing Engine
        </button>
      </PageHeader>

      {/* Latest Run KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Last Execution
          </span>
          <p className="text-lg font-bold text-slate-900 font-mono">
            {latestRun ? formatDate(latestRun.createdAt) : "Never executed"}
          </p>
          <div className="flex items-center space-x-2">
            {latestRun && <StatusBadge status={latestRun.status} />}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Subscriptions Examined
          </span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">
            {latestRun ? latestRun.processedSubscriptionsCount : 0}
          </p>
          <span className="text-xs text-slate-400">Due for billing</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Invoices Generated
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono">
            {latestRun ? latestRun.successfulInvoicesCount : 0}
          </p>
          <span className="text-xs text-slate-400">Created with frozen snapshots</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Failed Attempts
          </span>
          <p className="text-2xl font-extrabold text-rose-600 font-mono">
            {latestRun ? latestRun.failedInvoicesCount : 0}
          </p>
          <span className="text-xs text-slate-400">Skipped without billing advancement</span>
        </div>
      </div>

      {/* Execution Result Banner */}
      {lastResult && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-5 rounded-xl mb-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <div>
                <h4 className="font-bold text-sm">Billing Cycle Run Completed Successfully</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Processed {lastResult.processedCount} subscriptions — Generated {lastResult.invoicesGeneratedCount} invoices, skipped {lastResult.skippedCount} (idempotent duplicate protection).
                </p>
              </div>
            </div>
            <button
              onClick={() => setLastResult(null)}
              className="text-emerald-700 hover:text-emerald-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Billing Runs History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RotateCcw className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-800">Billing Runs History</h3>
          </div>
          <span className="text-xs text-slate-500">{runs.length} recorded run(s)</span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
              <th className="py-3 px-4">Run Date & Time</th>
              <th className="py-3 px-4">Target Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Processed</th>
              <th className="py-3 px-4 text-right">Invoices Created</th>
              <th className="py-3 px-4 text-right">Failed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {runs.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="py-3.5 px-4 font-mono text-xs text-slate-800">
                  {formatDate(r.createdAt)}
                </td>
                <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                  {formatDate(r.targetDate)}
                </td>
                <td className="py-3.5 px-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                  {r.processedSubscriptionsCount}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700">
                  {r.successfulInvoicesCount}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-700">
                  {r.failedInvoicesCount}
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  No billing runs executed yet. Click &quot;Run Billing Engine&quot; to execute your first cycle.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recent Billing Attempts Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-800">Recent Billing Attempts & Audit Log</h3>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
              <th className="py-3 px-4">Attempt Time</th>
              <th className="py-3 px-4">Subscription</th>
              <th className="py-3 px-4">Outcome</th>
              <th className="py-3 px-4">Generated Invoice</th>
              <th className="py-3 px-4">Details / Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {attempts.map((att) => (
              <tr key={att.id} className="hover:bg-slate-50/60">
                <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                  {formatDate(att.attemptedAt)}
                </td>
                <td className="py-3.5 px-4 font-mono text-xs font-semibold text-brand-600">
                  <Link href={`/admin/subscriptions/${att.subscriptionId}`}>
                    {att.subscription?.subscriptionNumber || att.subscriptionId.slice(0, 8)}
                  </Link>
                </td>
                <td className="py-3.5 px-4">
                  <StatusBadge status={att.status} />
                </td>
                <td className="py-3.5 px-4 font-mono text-xs">
                  {att.invoiceId ? (
                    <Link
                      href={`/admin/invoices/${att.invoiceId}`}
                      className="text-brand-600 hover:text-brand-800 underline font-semibold"
                    >
                      {att.invoice?.invoiceNumber || "View Invoice"}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-500">
                  {att.errorMessage || "Billing successfully processed"}
                </td>
              </tr>
            ))}
            {attempts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                  No billing attempts logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Trigger Billing Run Modal */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-semibold text-slate-900">Execute Billing Run</h3>
              </div>
              <button
                onClick={() => setShowRunModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteBilling} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                The billing engine scans all active subscriptions due on or before the selected target date, generates invoices, and advances their billing periods. Subscriptions already invoiced for this period will be skipped (idempotent protection).
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Billing Target Date
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Subscriptions with next billing date on or before this date will be invoiced.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRunModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={runningBilling}
                  className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  {runningBilling ? "Processing..." : "Run Billing Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
