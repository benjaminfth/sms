"use client";

import React, { useState, useEffect } from "react";
import { api, formatMinor } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  Zap,
  Play,
  CheckCircle,
  XCircle,
  Layers,
  Calendar,
  AlertCircle,
  Clock,
  ShieldAlert,
} from "lucide-react";

export default function BillingEnginePage() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [targetDate, setTargetDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const [runsData, attemptsData] = await Promise.all([
        api.get<any[]>("/billing/runs"),
        api.get<any[]>("/billing/attempts"),
      ]);
      setRuns(runsData || []);
      setAttempts(attemptsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRunBilling = async () => {
    if (!confirm(`Execute recurring billing engine up to ${targetDate}?`)) return;

    setRunning(true);
    setError(null);
    setLastResult(null);

    try {
      const result = await api.post<any>("/billing/run", {
        targetDate: new Date(`${targetDate}T23:59:59.000Z`).toISOString(),
      });
      setLastResult(result);
      fetchHistory();
    } catch (err: any) {
      setError(err.message || "Billing execution failed");
    } finally {
      setRunning(false);
    }
  };

  if (user && user.role !== "ADMIN" && user.role !== "STAFF") {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500">
          The Recurring Billing Engine is an administrative control module available to ADMIN users only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Zap className="w-6 h-6 mr-2 text-indigo-600" />
            Recurring Billing Engine
          </h1>
          <p className="text-sm text-slate-500">
            Automated period calculation, idempotent invoice issuance, and billing cycle orchestration
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Manual Execution Control Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300">
              Manual Execution & Scheduled Trigger
            </span>
            <h2 className="text-xl font-bold">Trigger Automated Billing Sweep</h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Identifies all active subscriptions due on or before the target date.
              Applies integer paise tax arithmetic, generates formal invoices, and advances billing dates idempotently.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-white/10 p-2 rounded-xl backdrop-blur-sm">
            <div className="text-left">
              <label className="block text-[10px] uppercase font-bold text-indigo-200 mb-0.5">
                Target Evaluation Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-transparent text-white text-sm border-0 focus:ring-0 font-mono"
              />
            </div>
            <button
              onClick={handleRunBilling}
              disabled={running || user?.role !== "ADMIN"}
              className="inline-flex items-center px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow transition-colors"
            >
              <Play className="w-4 h-4 mr-2" />
              {running ? "Processing..." : "Run Billing Now"}
            </button>
          </div>
        </div>

        {/* Live Result Banner */}
        {lastResult && (
          <div className="bg-white/15 border border-white/20 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center font-bold text-sm text-green-300">
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Billing Run Completed ({lastResult.billingRunId})
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-slate-200">
              <div>Subscriptions Checked: {lastResult.processedSubscriptionsCount}</div>
              <div className="text-green-300">Invoices Generated: {lastResult.successfulInvoicesCount}</div>
              <div className="text-blue-300">Skipped (Idempotent): {lastResult.skippedInvoicesCount}</div>
              <div className="text-rose-300">Failed Attempts: {lastResult.failedInvoicesCount}</div>
            </div>
          </div>
        )}
      </div>

      {/* Billing Runs History */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-6">
        <h3 className="text-base font-semibold text-slate-900">Billing Run Audit History</h3>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading history...</div>
        ) : runs.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            No billing runs recorded yet. Execute your first billing run above.
          </p>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 font-semibold text-slate-700 text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Run Timestamp</th>
                  <th className="px-4 py-3 text-left">Target Date</th>
                  <th className="px-4 py-3 text-center">Subscriptions</th>
                  <th className="px-4 py-3 text-center">Generated</th>
                  <th className="px-4 py-3 text-center">Failed</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {new Date(r.runDate).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(r.targetDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {r.processedSubscriptionsCount}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-green-700 font-semibold">
                      {r.successfulInvoicesCount}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-rose-600">
                      {r.failedInvoicesCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-green-100 text-green-800">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Billing Attempts Log */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-6">
        <h3 className="text-base font-semibold text-slate-900">Per-Subscription Billing Attempts</h3>

        {attempts.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No attempts logged yet.</p>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 font-semibold text-slate-700 text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Attempted At</th>
                  <th className="px-4 py-3 text-left">Subscription</th>
                  <th className="px-4 py-3 text-left">Invoice Reference</th>
                  <th className="px-4 py-3 text-center">Outcome</th>
                  <th className="px-4 py-3 text-left">Notes / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {attempts.slice(0, 15).map((att) => (
                  <tr key={att.id}>
                    <td className="px-4 py-2.5 text-slate-500 font-mono">
                      {new Date(att.attemptedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-indigo-600 font-medium">
                      <Link href={`/subscriptions/${att.subscriptionId}`}>
                        {att.subscription?.subscriptionNumber || att.subscriptionId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      {att.invoice ? (
                        <Link href={`/invoices/${att.invoice.id}`} className="text-indigo-600 hover:underline">
                          {att.invoice.invoiceNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          att.status === "SUCCESS"
                            ? "bg-green-100 text-green-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 truncate max-w-xs">
                      {att.errorMessage || "Invoice generated successfully"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

