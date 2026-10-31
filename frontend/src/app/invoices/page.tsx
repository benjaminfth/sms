"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api, formatMinor } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import {
  Search,
  Receipt,
  ArrowRight,
  Printer,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Ban,
} from "lucide-react";

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>("/invoices", {
        page,
        pageSize: 15,
        search,
        status: statusFilter,
      });
      setInvoices(data || []);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            PAID
          </span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            PARTIAL
          </span>
        );
      case "ISSUED":
      case "OPEN":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            ISSUED
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            OVERDUE
          </span>
        );
      case "VOID":
      case "CANCELLED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            <Ban className="w-3 h-3 mr-1" />
            VOID
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-sm text-slate-500">
            Issued commercial invoices, line snapshots, GST tax breakdowns, and outstanding balances
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice number, customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ISSUED">Issued / Open</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="VOID">Void</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
            <p className="text-sm">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No invoices found</h3>
            <p className="text-sm text-slate-500 mt-1">
              Recurring billing runs will automatically generate invoices for due subscriptions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Number</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Customer</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Due Date</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Total</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Balance Due</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-indigo-600">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{inv.customer?.fullName}</div>
                      {inv.customer?.companyName && (
                        <div className="text-xs text-slate-500">{inv.customer.companyName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900 font-mono">
                      {formatMinor(inv.totalAmountMinor, inv.currency)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-indigo-600 font-mono">
                      {formatMinor(inv.balanceDueMinor, inv.currency)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        View Details
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
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

