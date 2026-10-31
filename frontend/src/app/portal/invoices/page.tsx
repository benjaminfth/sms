"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { formatDate } from "@/lib/utils";
import {
  Receipt,
  Printer,
  Eye,
  CreditCard,
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

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-[#E5EAF1]">
        <h1 className="text-[26px] font-semibold tracking-tight text-[#172033] leading-tight">
          My Invoices
        </h1>
        <p className="mt-1 text-[13px] text-[#64748B]">
          Official billing statements, payment receipts and tax assessments for your account.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#94A3B8]">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#315CF5] border-t-transparent" />
          <p className="mt-2 text-[12px] text-[#64748B]">Loading billing statements...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-[10px] border border-[#E5EAF1] p-12 text-center shadow-xs">
          <div className="w-10 h-10 rounded-[8px] bg-[#F8FAFC] border border-[#E5EAF1] flex items-center justify-center mx-auto text-[#94A3B8] mb-3">
            <Receipt className="w-5 h-5" />
          </div>
          <h3 className="text-[15px] font-semibold text-[#172033]">No invoices found</h3>
          <p className="text-[13px] text-[#64748B] mt-1 max-w-sm mx-auto">
            You do not currently have any invoices issued under your customer account.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[10px] border border-[#E5EAF1] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Issue Date</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                  <th className="py-2.5 px-4 text-right">Balance Due</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-[#172033]">
                      <Link href={`/portal/invoices/${inv.id}`} className="hover:text-[#315CF5]">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#64748B]">
                      {formatDate(inv.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#64748B]">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-[#172033]">
                      <MoneyDisplay amountMinor={inv.totalAmountMinor} currency={inv.currency} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-[#C58A24]">
                      <MoneyDisplay amountMinor={inv.balanceDueMinor} currency={inv.currency} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <Link
                          href={`/portal/invoices/${inv.id}`}
                          className="px-2.5 py-1 text-[12px] font-medium rounded-[6px] bg-[#F8FAFC] border border-[#E5EAF1] text-[#172033] hover:bg-[#EFF4FE] hover:text-[#315CF5] transition"
                        >
                          {inv.status === "PAID" ? "View Details" : "Pay Now"}
                        </Link>
                      </div>
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
