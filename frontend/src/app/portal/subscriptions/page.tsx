"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Calendar,
  CreditCard,
  RefreshCw,
} from "lucide-react";

export default function CustomerSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubscriptions() {
      setLoading(true);
      try {
        const res = await api.get<any[]>("/portal/subscriptions");
        if (res.success && res.data) {
          setSubscriptions(res.data);
        }
      } catch (err) {
        console.error("Failed to load subscriptions:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSubscriptions();
  }, []);

  const formatINR = (minor?: string | number | bigint) => {
    if (minor === undefined || minor === null) return "₹0.00";
    const val = typeof minor === "string" ? parseInt(minor, 10) : Number(minor);
    return (val / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Active
          </span>
        );
      case "PAUSED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Paused
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Subscriptions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your active cloud plans, billing cycles, and subscription renewals.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No active subscriptions</h3>
          <p className="text-sm text-gray-500 mt-1">
            You do not currently have any active software subscriptions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subscriptions.map((sub) => {
            const planPrice = sub.plan?.prices?.[0]?.priceMinor;
            const interval = sub.plan?.billingInterval || "MONTHLY";

            return (
              <div
                key={sub.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-medium text-gray-400">
                        {sub.subscriptionNumber}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                        {sub.plan?.name || "Enterprise Plan"}
                      </h3>
                    </div>
                    {getStatusBadge(sub.status)}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-900">
                      {formatINR(planPrice)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">/ {interval.toLowerCase()}</span>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-gray-500">
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        Started:
                      </span>
                      <span className="font-medium text-gray-900">
                        {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-gray-500">
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Next Billing Date:
                      </span>
                      <span className="font-semibold text-primary">
                        {sub.nextBillingDate
                          ? new Date(sub.nextBillingDate).toLocaleDateString()
                          : "None"}
                      </span>
                    </div>

                    {sub.items && sub.items.length > 0 && (
                      <div className="pt-2">
                        <span className="text-gray-400 block mb-1">Included Services:</span>
                        <div className="flex flex-wrap gap-1">
                          {sub.items.map((it: any) => (
                            <span
                              key={it.id}
                              className="px-2 py-0.5 bg-gray-100 rounded text-[11px] font-medium text-gray-700"
                            >
                              {it.product?.name || "Feature Pack"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {sub.invoices?.length || 0} associated invoices
                  </span>
                  <Link
                    href={`/portal/subscriptions/${sub.id}`}
                    className="inline-flex items-center text-xs font-semibold text-primary hover:text-primary/80"
                  >
                    View Details
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
