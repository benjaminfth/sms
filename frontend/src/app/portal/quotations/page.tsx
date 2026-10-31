"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function CustomerQuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQuotations() {
      setLoading(true);
      try {
        const res = await api.get<any[]>("/portal/quotations");
        if (res.success && res.data) {
          setQuotations(res.data);
        }
      } catch (err) {
        console.error("Failed to load quotations:", err);
      } finally {
        setLoading(false);
      }
    }
    loadQuotations();
  }, []);

  const formatINR = (minor?: string | number | bigint) => {
    if (minor === undefined || minor === null) return "₹0.00";
    const val = typeof minor === "string" ? parseInt(minor, 10) : Number(minor);
    return (val / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Accepted
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Rejected
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            Expired
          </span>
        );
      case "SENT":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Awaiting Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Quotations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review customized service proposals, contract quotes, and approve them online.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : quotations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No quotations found</h3>
          <p className="text-sm text-gray-500 mt-1">
            You do not have any pending or historical quotations.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Quote Number</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4">Valid Until</th>
                  <th className="py-3.5 px-4 text-right">Total (Inc. Tax)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotations.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900">
                        {quote.quotationNumber}
                      </div>
                      <span className="text-xs text-gray-400">
                        {quote.items?.length || 0} line item(s)
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 text-xs">
                      {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="py-4 px-4 text-gray-600 text-xs">
                      {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-gray-900">
                      {formatINR(quote.totalAmountMinor)}
                    </td>
                    <td className="py-4 px-4 text-center">{getStatusBadge(quote.status)}</td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        href={`/portal/quotations/${quote.id}`}
                        className="inline-flex items-center text-xs font-semibold text-primary hover:text-primary/80"
                      >
                        Review
                        <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
