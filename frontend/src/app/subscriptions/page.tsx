"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api, formatMinor } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import {
  Plus,
  Search,
  Repeat,
  Play,
  Pause,
  XOctagon,
  ArrowRight,
  Calendar,
  CheckCircle,
} from "lucide-react";

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>("/subscriptions", {
        page,
        pageSize: 15,
        search,
        status: statusFilter,
      });
      setSubscriptions(data || []);
    } catch (err) {
      console.error("Failed to load subscriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubscriptions();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            ACTIVE
          </span>
        );
      case "PAUSED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Pause className="w-3 h-3 mr-1" />
            PAUSED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-800">
            <XOctagon className="w-3 h-3 mr-1" />
            CANCELLED
          </span>
        );
      case "TRIALING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            TRIALING
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscriptions</h1>
          <p className="text-sm text-slate-500">
            Active customer subscriptions, recurring terms, next billing cycles, and lifecycle controls
          </p>
        </div>

        {user?.role !== "CUSTOMER" && (
          <Link
            href="/subscriptions/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Subscription
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by subscription number, customer name..."
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
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="TRIALING">Trialing</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
            <p className="text-sm">Loading subscriptions...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center">
            <Repeat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No subscriptions found</h3>
            <p className="text-sm text-slate-500 mt-1">
              Convert an accepted quotation or create a new subscription manually.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Number</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Customer</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Interval</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Current Period</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Next Billing</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-indigo-600">
                      <Link href={`/subscriptions/${sub.id}`} className="hover:underline">
                        {sub.subscriptionNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{sub.customer?.fullName}</div>
                      {sub.customer?.companyName && (
                        <div className="text-xs text-slate-500">{sub.customer.companyName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="font-medium uppercase tracking-wider text-xs bg-slate-100 px-2 py-1 rounded">
                        {sub.billingInterval} ({sub.intervalCount})
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {new Date(sub.currentPeriodStart).toLocaleDateString()} –{" "}
                      {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 text-xs flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {new Date(sub.nextBillingDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/subscriptions/${sub.id}`}
                        className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Details
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

