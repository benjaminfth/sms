"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { formatDate } from "@/lib/utils";
import {
  CreditCard,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export default function CustomerPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPayments() {
      setLoading(true);
      try {
        const res = await api.get<any[]>("/portal/payments");
        if (res.success && res.data) {
          setPayments(res.data);
        }
      } catch (err) {
        console.error("Failed to load payments:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPayments();
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-[#E5EAF1]">
        <h1 className="text-[26px] font-semibold tracking-tight text-[#172033] leading-tight">
          Payment History
        </h1>
        <p className="mt-1 text-[13px] text-[#64748B]">
          Cleared payment receipts and transaction records for your subscription account.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#94A3B8]">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#315CF5] border-t-transparent" />
          <p className="mt-2 text-[12px] text-[#64748B]">Loading payment ledger...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-[10px] border border-[#E5EAF1] p-12 text-center shadow-xs">
          <div className="w-10 h-10 rounded-[8px] bg-[#F8FAFC] border border-[#E5EAF1] flex items-center justify-center mx-auto text-[#94A3B8] mb-3">
            <CreditCard className="w-5 h-5" />
          </div>
          <h3 className="text-[15px] font-semibold text-[#172033]">No payments recorded</h3>
          <p className="text-[13px] text-[#64748B] mt-1 max-w-sm mx-auto">
            Cleared receipts from completed online transactions or bank deposits will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                  <th className="py-2.5 px-4">Payment Reference</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Payment Method</th>
                  <th className="py-2.5 px-4 text-right">Amount Paid</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-[#172033]">
                      {p.paymentReference}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#64748B]">
                      {formatDate(p.paidAt || p.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-mono uppercase bg-[#F8FAFC] text-[#64748B] px-2 py-0.5 rounded-[4px] border border-[#E5EAF1]">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-[#16865B]">
                      <MoneyDisplay amountMinor={p.amountMinor} currency={p.currency} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <StatusBadge status={p.status} />
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
