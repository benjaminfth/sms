"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api, formatMinor } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Ban,
  CheckCircle,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  AlertTriangle,
} from "lucide-react";

export default function InvoiceDetailsPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchInvoice = async () => {
    try {
      const data = await api.get<any>(`/invoices/${id}`);
      setInvoice(data);
    } catch (err: any) {
      setError(err.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleVoid = async () => {
    const reason = prompt("Reason for voiding this invoice:");
    if (!reason) return;

    setActionLoading(true);
    setError(null);
    setMessage(null);

    try {
      await api.post(`/invoices/${id}/void`, { reason });
      setMessage("Invoice voided successfully.");
      fetchInvoice();
    } catch (err: any) {
      setError(err.message || "Failed to void invoice");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
        <p className="text-sm">Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center text-rose-600">
        <p>{error || "Invoice not found"}</p>
        <Link href="/invoices" className="text-sm text-indigo-600 hover:underline mt-2 inline-block">
          Return to invoices
        </Link>
      </div>
    );
  }

  const isPaid = invoice.status === "PAID";
  const canVoid = user?.role !== "CUSTOMER" && invoice.status !== "VOID" && !isPaid && BigInt(invoice.amountPaidMinor || "0") === 0n;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar (Hidden during printing) */}
      <div className="flex justify-between items-center no-print">
        <div className="flex items-center space-x-3">
          <Link
            href="/invoices"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {invoice.invoiceNumber}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isPaid
                    ? "bg-green-100 text-green-800"
                    : invoice.status === "VOID"
                    ? "bg-slate-200 text-slate-700"
                    : "bg-indigo-100 text-indigo-800"
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued on {new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {canVoid && (
            <button
              onClick={handleVoid}
              disabled={actionLoading}
              className="inline-flex items-center px-3.5 py-2 border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 text-sm font-medium rounded-lg"
            >
              <Ban className="w-4 h-4 mr-1.5" />
              Void Invoice
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print / Download PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm no-print">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm no-print">
          {message}
        </div>
      )}

      {/* Printable Invoice Sheet */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 space-y-8">
        {/* Brand & Reference */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-8">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                BL
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Brightloop Software</h2>
                <p className="text-xs text-slate-500">Subscription Management & Billing Platform</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-0.5 mt-3">
              <p>Cyber City Tech Park, Tower B, Phase 2</p>
              <p>Bengaluru, Karnataka 560100, India</p>
              <p className="font-mono text-slate-600">GSTIN: 29AAAAA0000A1Z5</p>
            </div>
          </div>

          <div className="text-right space-y-1">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-wider block">
              TAX INVOICE
            </span>
            <div className="text-sm font-mono font-bold text-indigo-600">{invoice.invoiceNumber}</div>
            <div className="text-xs text-slate-500 pt-2 space-y-0.5">
              <div>Invoice Date: {new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString()}</div>
              <div className="font-semibold text-slate-800">
                Payment Due: {new Date(invoice.dueDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Bill To & Billing Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Billed To
            </span>
            <div className="font-bold text-slate-900 text-base">{invoice.customer?.fullName}</div>
            {invoice.customer?.companyName && (
              <div className="text-xs text-slate-600 flex items-center mt-0.5">
                <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {invoice.customer.companyName}
              </div>
            )}
            <div className="text-xs text-slate-500 mt-2 space-y-0.5">
              <p>{invoice.customer?.billingAddressLine1 || "Tower B, Phase 2"}</p>
              <p>{invoice.customer?.city || "Bengaluru"}, {invoice.customer?.state || "Karnataka"}</p>
              <p>GST/Tax ID: {invoice.customer?.gstOrTaxId || "Unregistered"}</p>
            </div>
          </div>

          <div className="sm:text-right space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Service Period
            </span>
            {invoice.billingPeriodStart && invoice.billingPeriodEnd ? (
              <div className="text-xs text-slate-700 font-medium">
                {new Date(invoice.billingPeriodStart).toLocaleDateString()} –{" "}
                {new Date(invoice.billingPeriodEnd).toLocaleDateString()}
              </div>
            ) : (
              <div className="text-xs text-slate-400">One-time / manual billing</div>
            )}
            {invoice.subscription && (
              <p className="text-xs text-slate-500 font-mono">
                Subscription: {invoice.subscription.subscriptionNumber}
              </p>
            )}
            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Invoice Status
              </span>
              <span className="inline-block mt-1 font-bold text-sm uppercase text-slate-900">
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">GST (18%)</th>
                <th className="px-4 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items?.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.description}</td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">
                    {parseFloat(item.quantity).toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">
                    {formatMinor(item.unitPriceMinor, invoice.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">
                    {formatMinor(item.taxAmountMinor, invoice.currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 font-mono">
                    {formatMinor(item.totalAmountMinor, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Breakdown */}
        <div className="flex justify-end">
          <div className="w-80 space-y-2.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">{formatMinor(invoice.subtotalMinor, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxes (GST-18):</span>
              <span className="font-mono font-medium">{formatMinor(invoice.taxAmountMinor, invoice.currency)}</span>
            </div>
            {BigInt(invoice.discountAmountMinor || "0") > 0n && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span className="font-mono font-medium">-{formatMinor(invoice.discountAmountMinor, invoice.currency)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-base text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-lg text-indigo-600">{formatMinor(invoice.totalAmountMinor, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-xs pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono">{formatMinor(invoice.amountPaidMinor, invoice.currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-slate-900 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span>Outstanding Balance Due:</span>
              <span className="font-mono text-indigo-600">{formatMinor(invoice.balanceDueMinor, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {/* Payment History Allocations (Developer 3 Integration) */}
        {invoice.paymentAllocations?.length > 0 && (
          <div className="border-t border-slate-100 pt-6 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center">
              <CreditCard className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Allocated Payments
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50 font-semibold text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Payment Ref</th>
                    <th className="px-3 py-2 text-left">Method</th>
                    <th className="px-3 py-2 text-right">Allocated Amount</th>
                    <th className="px-3 py-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.paymentAllocations.map((alloc: any) => (
                    <tr key={alloc.id}>
                      <td className="px-3 py-2 font-mono font-medium">{alloc.payment?.paymentReference}</td>
                      <td className="px-3 py-2">{alloc.payment?.paymentMethod}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-green-700">
                        {formatMinor(alloc.allocatedAmountMinor, invoice.currency)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500">
                        {new Date(alloc.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Print Terms & Notes Footer */}
        <div className="border-t border-slate-100 pt-6 text-[11px] text-slate-400 space-y-1">
          <p>Computer generated tax invoice. No physical signature required.</p>
          <p>Please remit payments according to agreed commercial contract terms.</p>
        </div>
      </div>
    </div>
  );
}

