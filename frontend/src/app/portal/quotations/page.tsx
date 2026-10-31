"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { formatDate } from "@/lib/utils";
import {
  FileText,
  Calendar,
  ArrowRight,
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

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-[#E5EAF1]">
        <h1 className="text-[26px] font-semibold tracking-tight text-[#172033] leading-tight">
          My Quotations
        </h1>
        <p className="mt-1 text-[13px] text-[#64748B]">
          Commercial proposals, software estimates and subscription quotations pending review.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#94A3B8]">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#315CF5] border-t-transparent" />
          <p className="mt-2 text-[12px] text-[#64748B]">Loading proposals...</p>
        </div>
      ) : quotations.length === 0 ? (
        <div className="bg-white rounded-[10px] border border-[#E5EAF1] p-12 text-center shadow-xs">
          <div className="w-10 h-10 rounded-[8px] bg-[#F8FAFC] border border-[#E5EAF1] flex items-center justify-center mx-auto text-[#94A3B8] mb-3">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-[15px] font-semibold text-[#172033]">No quotations on file</h3>
          <p className="text-[13px] text-[#64748B] mt-1 max-w-sm mx-auto">
            You do not currently have any pending commercial estimates or proposals.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                  <th className="py-2.5 px-4">Quotation #</th>
                  <th className="py-2.5 px-4">Date Issued</th>
                  <th className="py-2.5 px-4">Valid Until</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-[#172033]">
                      <Link href={`/portal/quotations/${q.id}`} className="hover:text-[#315CF5]">
                        {q.quotationNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#64748B]">
                      {formatDate(q.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#64748B]">
                      {formatDate(q.validUntil)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-[#172033]">
                      <MoneyDisplay amountMinor={q.totalAmountMinor} currency={q.currency} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/portal/quotations/${q.id}`}
                        className="px-2.5 py-1 text-[12px] font-medium rounded-[6px] bg-[#F8FAFC] border border-[#E5EAF1] text-[#172033] hover:bg-[#EFF4FE] hover:text-[#315CF5] transition"
                      >
                        Review Proposal
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
