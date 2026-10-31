"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { InvoiceWithDetailsDTO } from "@sms/shared";
import { formatMinorToCurrency, formatDate } from "@/lib/utils";
import { Printer, Sparkles } from "lucide-react";

export default function PrintInvoicePage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceWithDetailsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<InvoiceWithDetailsDTO>(`/invoices/${id}`);
        if (res.data) setInvoice(res.data);
      } catch (err) {
        console.error("Failed to load invoice for printing:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Loading invoice printable view...</div>;
  }

  if (!invoice) {
    return <div className="p-10 text-center text-rose-500">Invoice not found.</div>;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-8 max-w-4xl mx-auto print:p-0 print:max-w-none">
      {/* Top Toolbar for Screen View */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200 print:hidden">
        <span className="text-sm text-slate-500">Print Preview</span>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print / Download PDF
        </button>
      </div>

      {/* Invoice Document Body */}
      <div className="border border-slate-200 p-8 rounded-xl print:border-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-900">
                Brightloop Software
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Subscription Management & Recurring Billing Platform
            </p>
            <p className="text-xs text-slate-500">
              Cyber City, Tower B, Phase 2, Bengaluru, KA 560100
            </p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              GSTIN: 29AAACB1234F1Z0 | support@brightloop.io
            </p>
          </div>

          <div className="text-right">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
              INVOICE
            </h1>
            <p className="text-sm font-bold font-mono text-indigo-600 mt-1">
              {invoice.invoiceNumber}
            </p>
            <div className="mt-3 text-xs text-slate-600 space-y-0.5">
              <div>
                <span className="text-slate-400">Date: </span>
                <span className="font-mono font-medium">{formatDate(invoice.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-400">Due Date: </span>
                <span className="font-mono font-medium">{formatDate(invoice.dueDate)}</span>
              </div>
              <div>
                <span className="text-slate-400">Status: </span>
                <span className="font-bold uppercase tracking-wider">{invoice.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To & Billing Period */}
        <div className="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-slate-200">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Billed To
            </h3>
            <p className="text-base font-bold text-slate-900">{invoice.customer?.fullName}</p>
            {invoice.customer?.companyName && (
              <p className="text-sm font-semibold text-slate-700">{invoice.customer.companyName}</p>
            )}
            <p className="text-xs text-slate-600 mt-1">
              {invoice.customer?.billingAddressLine1}
              {invoice.customer?.city ? `, ${invoice.customer.city}` : ""}
              {invoice.customer?.state ? `, ${invoice.customer.state}` : ""}
            </p>
            {invoice.customer?.gstOrTaxId && (
              <p className="text-xs font-mono text-slate-500 mt-1">
                Customer GST: {invoice.customer.gstOrTaxId}
              </p>
            )}
          </div>

          <div className="text-right">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Billing Period Details
            </h3>
            {invoice.billingPeriodStart && invoice.billingPeriodEnd ? (
              <p className="text-xs font-mono text-slate-800">
                {formatDate(invoice.billingPeriodStart)} to {formatDate(invoice.billingPeriodEnd)}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Standard Service Invoice</p>
            )}
            {invoice.subscription && (
              <p className="text-xs font-mono text-slate-600 mt-1">
                Subscription Ref: {invoice.subscription.subscriptionNumber}
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full text-left border-collapse mb-8">
          <thead>
            <tr className="border-b-2 border-slate-900 text-xs font-bold uppercase tracking-wider text-slate-800">
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3 text-right">Qty</th>
              <th className="py-2.5 px-3 text-right">Unit Price</th>
              <th className="py-2.5 px-3 text-right">Tax (GST)</th>
              <th className="py-2.5 px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {invoice.items.map((it) => (
              <tr key={it.id}>
                <td className="py-3 px-3">
                  <p className="font-semibold text-slate-900">{it.description}</p>
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-700">
                  {parseFloat(it.quantity).toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-700">
                  {formatMinorToCurrency(it.unitPriceMinor, invoice.currency)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-700">
                  {formatMinorToCurrency(it.taxAmountMinor, invoice.currency)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                  {formatMinorToCurrency(it.totalAmountMinor, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-72 space-y-2 text-sm border-t border-slate-200 pt-4">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">
                {formatMinorToCurrency(invoice.subtotalMinor, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxes (GST 18%):</span>
              <span className="font-mono font-medium">
                {formatMinorToCurrency(invoice.taxAmountMinor, invoice.currency)}
              </span>
            </div>
            {BigInt(invoice.discountAmountMinor) > BigInt(0) && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount Applied:</span>
                <span className="font-mono font-medium">
                  -{formatMinorToCurrency(invoice.discountAmountMinor, invoice.currency)}
                </span>
              </div>
            )}
            <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-base font-black text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono">
                {formatMinorToCurrency(invoice.totalAmountMinor, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono">
                {formatMinorToCurrency(invoice.amountPaidMinor, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
              <span>Balance Due:</span>
              <span className="font-mono text-indigo-700">
                {formatMinorToCurrency(invoice.balanceDueMinor, invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Terms & Footer */}
        <div className="border-t border-slate-200 pt-6 text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700 uppercase tracking-wider">Terms & Notes</p>
          <p>Payment is due within 15 days of invoice issue date. Electronic bank transfers, cards, and UPI accepted.</p>
          <p className="pt-4 text-center text-slate-400">Thank you for choosing Brightloop Software!</p>
        </div>
      </div>
    </div>
  );
}
