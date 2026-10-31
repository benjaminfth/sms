"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Calendar,
} from "lucide-react";

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvoices() {
      setLoading(true);
      try {
        const res = await api.get<any[]>("/portal/invoices");
        if (res.success && res.data) {
          setInvoices(res.data);
        }
      } catch (err) {
        console.error("Failed to load invoices:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInvoices();
  }, []);

  const getStatusBadge = (status: string) => {
    if (status === "PAID") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Paid
        </span>
      );
    }
    if (status === "PARTIALLY_PAID") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
          <Clock className="w-3.5 h-3.5 mr-1" />
          Partially Paid
        </span>
      );
    }
    if (status === "OVERDUE") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          Overdue
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-brand-700">
        Issued
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Invoices</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review billing statements, inspect line-item taxes, and initiate invoice payments
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No invoices found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Your account has no issued statements at this time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invoices.map((inv) => {
                  const total = (Number(inv.totalAmountMinor) / 100).toLocaleString("en-IN");
                  const paid = (Number(inv.amountPaidMinor) / 100).toLocaleString("en-IN");
                  const due = (Number(inv.balanceDueMinor) / 100).toLocaleString("en-IN");

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        #{inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{new Date(inv.dueDate).toLocaleDateString("en-IN")}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">₹{total}</td>
                      <td className="py-3 px-4 font-mono text-emerald-600">₹{paid}</td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-600">
                        ₹{due}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(inv.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/portal/invoices/${inv.id}`}
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            inv.status === "PAID"
                              ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              : "bg-brand-600 text-white hover:bg-brand-700 shadow-xs"
                          }`}
                        >
                          {inv.status === "PAID" ? "View Details" : "Pay Statement"}
                          <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
