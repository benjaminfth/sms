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
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Calendar,
  Layers,
  FileText,
  AlertCircle,
  X,
  RefreshCw,
} from "lucide-react";

export default function BillingEnginePage() {
  const [runs, setRuns] = useState<BillingRunDTO[]>([]);
  const [attempts, setAttempts] = useState<BillingAttemptDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBilling, setRunningBilling] = useState(false);
  const [lastResult, setLastResult] = useState<any | null>(null);

  // Run modal state
  const [showRunModal, setShowRunModal] = useState(false);
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [batchSize, setBatchSize] = useState(50);
  const [retryFailedOnly, setRetryFailedOnly] = useState(false);
  const [maxRetries, setMaxRetries] = useState(3);

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
        batchSize: Number(batchSize) || 50,
        retryFailedOnly,
        maxRetries: Number(maxRetries) || 3,
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
        description="Automated subscription billing cycle execution, sequential recovery, retry management, and idempotency protection."
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
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-slate-900 font-semibold">
              {latestRun ? formatDate(latestRun.runDate) : "Never"}
            </span>
            {latestRun && <StatusBadge status={latestRun.status} />}
          </div>
          <p className="text-xs text-slate-400">
            Target date: {latestRun ? formatDate(latestRun.targetDate) : "-"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Processed Subscriptions
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {latestRun ? latestRun.processedSubscriptionsCount : 0}
            </span>
            <Layers className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-xs text-slate-400">Evaluated in last batch</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Invoices Generated
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-emerald-600 font-mono">
              {latestRun ? latestRun.successfulInvoicesCount : 0}
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-slate-400">Issued & advanced periods</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Failed Invoices
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-rose-600 font-mono">
              {latestRun ? latestRun.failedInvoicesCount : 0}
            </span>
            <XCircle className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-xs text-slate-400">Failed / Retriable attempts</p>
        </div>
      </div>

      {/* Realtime Run Outcome Banner */}
      {lastResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-emerald-200/60 pb-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-emerald-900 text-sm">
                Billing Run Completed Successfully
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-700 font-medium">
              Run ID: {lastResult.runId.slice(0, 8)}...
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-emerald-800 font-mono">
            <div>Processed: <span className="font-bold">{lastResult.processedCount}</span></div>
            <div>Invoices Generated: <span className="font-bold">{lastResult.invoicesGeneratedCount}</span></div>
            <div>Skipped (Idempotent): <span className="font-bold">{lastResult.skippedCount}</span></div>
            <div>Failed Attempts: <span className="font-bold text-rose-700">{lastResult.failedCount}</span></div>
          </div>
        </div>
      )}

      {/* Billing Runs History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">Historical Billing Runs</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">{runs.length} runs logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Run Date</th>
                <th className="px-6 py-3">Target Date</th>
                <th className="px-6 py-3 text-right">Processed</th>
                <th className="px-6 py-3 text-right">Generated</th>
                <th className="px-6 py-3 text-right">Failed</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-800">
                    {formatDate(run.runDate)}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">
                    {formatDate(run.targetDate)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs">
                    {run.processedSubscriptionsCount}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-emerald-600 font-semibold">
                    {run.successfulInvoicesCount}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-rose-600 font-semibold">
                    {run.failedInvoicesCount}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={run.status} />
                  </td>
                </tr>
              ))}
              {runs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-xs text-slate-400">
                    No billing engine runs executed yet. Click &quot;Run Billing Engine&quot; to execute.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Billing Attempts Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">Recent Subscription Billing Attempts</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">Real-time outcome audit</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Subscription</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Invoice Generated</th>
                <th className="px-6 py-3">Error / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.map((att) => (
                <tr key={att.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">
                    {formatDate(att.attemptedAt)}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-brand-600">
                    <Link href={`/admin/subscriptions/${att.subscriptionId}`}>
                      {att.subscription?.subscriptionNumber || att.subscriptionId.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={att.status} />
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    {att.invoice ? (
                      <Link
                        href={`/admin/invoices/${att.invoice.id}`}
                        className="text-brand-600 hover:text-brand-800 font-semibold"
                      >
                        {att.invoice.invoiceNumber}
                      </Link>
                    ) : (
                      <span className="text-slate-400 italic">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                    {att.errorMessage || "-"}
                  </td>
                </tr>
              ))}
              {attempts.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-400">
                    No attempts recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                The billing engine scans active subscriptions due on or before the selected target date, generates invoices, and advances billing periods. Catch-up logic will sequentially invoice any missed periods during outages.
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Max Retries
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retryFailedOnly}
                    onChange={(e) => setRetryFailedOnly(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="font-medium text-xs">Retry previously failed subscriptions only</span>
                </label>
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
