"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { InvoiceWithDetailsDTO, formatMinorToCurrency } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Printer } from "lucide-react";

export default function PrintInvoicePage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceWithDetailsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvoice() {
      try {
        const res = await api.get<InvoiceWithDetailsDTO>(`/invoices/${id}`);
        if (res.success && res.data) {
          setInvoice(res.data);
        }
      } catch (err) {
        console.error("Failed to load invoice for printing:", err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadInvoice();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <p className="text-[13px] text-[#64748B]">Preparing printable invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <p className="text-[13px] text-[#D14343]">Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#172033] p-8 md:p-14 font-sans print:p-0">
      {/* Print Trigger (Hidden during browser print) */}
      <div className="max-w-3xl mx-auto mb-6 flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center px-4 py-2 rounded-[8px] bg-[#172033] text-white text-[13px] font-medium shadow-xs hover:bg-[#000000] transition"
        >
          <Printer className="w-4 h-4 mr-1.5" />
          Print / Save PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto border border-[#E5EAF1] p-10 rounded-[12px] print:border-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start pb-8 border-b border-[#E5EAF1]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[20px] font-bold tracking-tight text-[#172033]">
                Brightloop Software
              </span>
            </div>
            <p className="text-[12px] text-[#64748B] mt-1">
              Subscription Management & Recurring Billing Platform
            </p>
            <p className="text-[12px] text-[#64748B]">
              Cyber City, Tower B, Phase 2, Bengaluru, KA 560100
            </p>
            <p className="text-[11px] font-mono text-[#94A3B8] mt-0.5">
              GSTIN: 29AAACB1234F1Z0 | support@brightloop.io
            </p>
          </div>

          <div className="text-right">
            <h1 className="text-[24px] font-bold text-[#172033] tracking-tight uppercase">
              TAX INVOICE
            </h1>
            <p className="text-[14px] font-bold font-mono text-[#315CF5] mt-0.5">
              {invoice.invoiceNumber}
            </p>
            <div className="mt-2 text-[12px] text-[#64748B] space-y-0.5">
              <div>Issue Date: <span className="font-mono text-[#172033]">{formatDate(invoice.createdAt)}</span></div>
              <div>Due Date: <span className="font-mono text-[#172033]">{formatDate(invoice.dueDate)}</span></div>
              <div>Status: <span className="font-bold text-[#172033] uppercase">{invoice.status}</span></div>
            </div>
          </div>
        </div>

        {/* Bill To & Billing Period */}
        <div className="grid grid-cols-2 gap-8 my-6 pb-6 border-b border-[#E5EAF1]">
          <div>
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] mb-1.5">
              Billed To
            </h3>
            <p className="text-[14px] font-semibold text-[#172033]">{invoice.customer?.fullName}</p>
            {invoice.customer?.companyName && (
              <p className="text-[13px] text-[#64748B]">{invoice.customer.companyName}</p>
            )}
            <p className="text-[12px] text-[#64748B] mt-1">
              {[invoice.customer?.billingAddressLine1, invoice.customer?.city, invoice.customer?.state]
                .filter(Boolean)
                .join(", ")}
            </p>
            {invoice.customer?.gstOrTaxId && (
              <p className="text-[11px] font-mono text-[#64748B] mt-1">
                Customer GSTIN: {invoice.customer.gstOrTaxId}
              </p>
            )}
          </div>

          <div className="text-right">
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] mb-1.5">
              Billing Period
            </h3>
            {invoice.billingPeriodStart && invoice.billingPeriodEnd ? (
              <p className="text-[12px] font-mono text-[#172033]">
                {formatDate(invoice.billingPeriodStart)} to {formatDate(invoice.billingPeriodEnd)}
              </p>
            ) : (
              <p className="text-[12px] text-[#64748B]">Standard Service Cycle</p>
            )}
            {invoice.subscription && (
              <p className="text-[11px] font-mono text-[#64748B] mt-1">
                Subscription Ref: {invoice.subscription.subscriptionNumber}
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full text-left border-collapse mb-8 text-[13px]">
          <thead>
            <tr className="border-b-2 border-[#172033] text-[11px] font-semibold uppercase tracking-wider text-[#172033]">
              <th className="py-2.5 px-2">Description</th>
              <th className="py-2.5 px-2 text-right">Qty</th>
              <th className="py-2.5 px-2 text-right">Unit Price</th>
              <th className="py-2.5 px-2 text-right">Tax (GST)</th>
              <th className="py-2.5 px-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF1]">
            {invoice.items.map((it) => (
              <tr key={it.id}>
                <td className="py-3 px-2">
                  <p className="font-medium text-[#172033]">{it.description}</p>
                </td>
                <td className="py-3 px-2 text-right font-mono text-[#64748B]">
                  {parseFloat(it.quantity).toFixed(2)}
                </td>
                <td className="py-3 px-2 text-right font-mono text-[#172033]">
                  {formatMinorToCurrency(it.unitPriceMinor, invoice.currency)}
                </td>
                <td className="py-3 px-2 text-right font-mono text-[#64748B]">
                  {formatMinorToCurrency(it.taxAmountMinor, invoice.currency)}
                </td>
                <td className="py-3 px-2 text-right font-mono font-medium text-[#172033]">
                  {formatMinorToCurrency(it.totalAmountMinor, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-72 space-y-2 text-[13px] border-t border-[#E5EAF1] pt-4">
            <div className="flex justify-between text-[#64748B]">
              <span>Subtotal:</span>
              <span className="font-mono text-[#172033]">
                {formatMinorToCurrency(invoice.subtotalMinor, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>Taxes (GST 18%):</span>
              <span className="font-mono text-[#172033]">
                {formatMinorToCurrency(invoice.taxAmountMinor, invoice.currency)}
              </span>
            </div>
            {BigInt(invoice.discountAmountMinor) > BigInt(0) && (
              <div className="flex justify-between text-[#16865B]">
                <span>Discount Applied:</span>
                <span className="font-mono">
                  -{formatMinorToCurrency(invoice.discountAmountMinor, invoice.currency)}
                </span>
              </div>
            )}
            <div className="border-t-2 border-[#172033] pt-2 flex justify-between text-[15px] font-bold text-[#172033]">
              <span>Grand Total:</span>
              <span className="font-mono">
                {formatMinorToCurrency(invoice.totalAmountMinor, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-[#16865B] font-medium pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono">
                {formatMinorToCurrency(invoice.amountPaidMinor, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-[#172033] font-bold border-t border-[#E5EAF1] pt-1">
              <span>Balance Due:</span>
              <span className="font-mono text-[#315CF5]">
                {formatMinorToCurrency(invoice.balanceDueMinor, invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Terms & Footer */}
        <div className="border-t border-[#E5EAF1] pt-6 text-[11px] text-[#64748B] space-y-1">
          <p className="font-semibold text-[#172033] uppercase tracking-wider">Payment Instructions</p>
          <p>Please remit outstanding balance within 15 days via NEFT/RTGS, UPI, or corporate card.</p>
          <p className="pt-2 text-center text-[#94A3B8]">Thank you for partnering with Brightloop SMS.</p>
        </div>
      </div>
    </div>
  );
}
