"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api, formatMinor } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import {
  Plus,
  Search,
  FileText,
  CheckCircle,
  XCircle,
  Send,
  ArrowRight,
  Clock,
  Layers,
} from "lucide-react";

export default function QuotationsPage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>("/quotations", {
        page,
        pageSize: 15,
        search,
        status: statusFilter,
      });
      setQuotations(data || []);
    } catch (err) {
      console.error("Failed to load quotations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQuotations();
  };

  const getStatusBadge = (status: string, hasSubscription: boolean) => {
    if (hasSubscription) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
          <Layers className="w-3 h-3 mr-1" />
          CONVERTED
        </span>
      );
    }

    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            DRAFT
          </span>
        );
      case "SENT":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <Send className="w-3 h-3 mr-1" />
            SENT
          </span>
        );
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            ACCEPTED
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3 mr-1" />
            REJECTED
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 mr-1" />
            EXPIRED
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quotations</h1>
          <p className="text-sm text-slate-500">
            Commercial proposals, pricing contracts, customer acceptance, and subscription conversion
          </p>
        </div>

        {user?.role !== "CUSTOMER" && (
          <Link
            href="/quotations/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Quotation
          </Link>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by quotation number, customer name..."
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
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
            <p className="text-sm">Loading quotations...</p>
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No quotations found</h3>
            <p className="text-sm text-slate-500 mt-1">
              {search || statusFilter
                ? "Try adjusting your filters or search terms."
                : "Create your first customer commercial quotation."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Number</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Customer</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Valid Until</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Total Amount</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((quo) => {
                  const hasSub = Boolean(quo.subscription);
                  return (
                    <tr key={quo.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-indigo-600">
                        <Link href={`/quotations/${quo.id}`} className="hover:underline">
                          {quo.quotationNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{quo.customer?.fullName}</div>
                        {quo.customer?.companyName && (
                          <div className="text-xs text-slate-500">{quo.customer.companyName}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(quo.validUntil).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatMinor(quo.totalAmountMinor, quo.currency)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(quo.status, hasSub)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/quotations/${quo.id}`}
                          className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          View Details
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
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

