"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  ArrowLeft,
  Receipt,
  Download,
  Printer,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Sparkles,
  Smartphone,
  ShieldCheck,
  X,
  FileText,
} from "lucide-react";

export default function CustomerInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Demo Payment Modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARD" | "BANK_TRANSFER">("UPI");
  const [paying, setPaying] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);

  useEffect(() => {
    async function loadInvoice() {
      setLoading(true);
      try {
        const res = await api.get<any>(`/portal/invoices/${id}`);
        if (res.success && res.data) {
          setInvoice(res.data);
        } else {
          setError(res.error?.message || "Invoice not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }
    if (id) loadInvoice();
  }, [id]);

  const handlePayInvoice = async () => {
    setPaying(true);
    try {
      const res = await api.post<any>(`/portal/invoices/${id}/pay`, {
        paymentMethod,
      });

      if (res.success && res.data) {
        setPaymentSuccessData(res.data);
        // Refresh invoice data
        const refreshed = await api.get<any>(`/portal/invoices/${id}`);
        if (refreshed.success && refreshed.data) {
          setInvoice(refreshed.data);
        }
      } else {
        alert(res.error?.message || "Payment failed to process");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred while processing payment");
    } finally {
      setPaying(false);
    }
  };

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
      case "PAID":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Paid in Full
          </span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Partially Paid
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Open / Awaiting Payment
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Failed to load invoice</h2>
        <p className="text-gray-500 mt-1">{error || "The requested invoice could not be found."}</p>
        <Link
          href="/portal/invoices"
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Invoices
        </Link>
      </div>
    );
  }

  const balanceDue = Number(invoice.balanceDueMinor || 0);
  const isPayable = balanceDue > 0 && invoice.status !== "VOID" && invoice.status !== "CANCELLED";

  // Parse tax breakdown snapshot if available
  let taxBreakdown: any[] = [];
  if (invoice.taxBreakdownSnapshot) {
    try {
      taxBreakdown = typeof invoice.taxBreakdownSnapshot === "string"
        ? JSON.parse(invoice.taxBreakdownSnapshot)
        : invoice.taxBreakdownSnapshot;
    } catch (e) {
      taxBreakdown = [];
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <Link
          href="/portal/invoices"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to All Invoices
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print / Save PDF
          </button>
          {isPayable && (
            <button
              onClick={() => {
                setPaymentSuccessData(null);
                setIsPayModalOpen(true);
              }}
              className="inline-flex items-center px-5 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay {formatINR(invoice.balanceDueMinor)}
            </button>
          )}
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8 sm:p-12 print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-8 border-b border-gray-200 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg">
                B
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                Brightloop Software
              </span>
            </div>
            <p className="text-xs text-gray-500">Subscription & Cloud Solutions</p>
            <p className="text-xs text-gray-500 mt-1">GSTIN: 29AABCU9603R1ZM</p>
            <p className="text-xs text-gray-500">support@brightloop.io | billing.brightloop.io</p>
          </div>

          <div className="text-left sm:text-right">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">TAX INVOICE</h1>
            <p className="text-sm font-semibold text-primary mt-1">{invoice.invoiceNumber}</p>
            <div className="mt-2">{getStatusBadge(invoice.status)}</div>
          </div>
        </div>

        {/* Invoice Metadata & Customer Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-gray-200 text-sm">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              Billed To
            </span>
            <p className="font-bold text-gray-900 text-base">{invoice.customer?.fullName}</p>
            {invoice.customer?.companyName && (
              <p className="text-gray-600 font-medium">{invoice.customer.companyName}</p>
            )}
            <p className="text-gray-500 mt-1">{invoice.customer?.email}</p>
            {invoice.customer?.phone && (
              <p className="text-gray-500">{invoice.customer.phone}</p>
            )}
            {invoice.customer?.billingAddressLine1 && (
              <p className="text-gray-500 mt-1">
                {invoice.customer.billingAddressLine1}
                {invoice.customer.billingAddressLine2 && `, ${invoice.customer.billingAddressLine2}`}
                <br />
                {invoice.customer.city}, {invoice.customer.state} - {invoice.customer.postalCode}
              </p>
            )}
            {invoice.customer?.gstOrTaxId && (
              <p className="text-xs text-gray-600 font-medium mt-2">
                Customer GSTIN / Tax ID: {invoice.customer.gstOrTaxId}
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-2">
            <div>
              <span className="text-xs text-gray-500">Invoice Date:</span>
              <span className="ml-2 font-medium text-gray-900">
                {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500">Payment Due Date:</span>
              <span className="ml-2 font-semibold text-rose-600">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "Upon Receipt"}
              </span>
            </div>
            {invoice.paidAt && (
              <div>
                <span className="text-xs text-gray-500">Settled On:</span>
                <span className="ml-2 font-medium text-emerald-600">
                  {new Date(invoice.paidAt).toLocaleDateString()}
                </span>
              </div>
            )}
            <div>
              <span className="text-xs text-gray-500">Currency:</span>
              <span className="ml-2 font-medium text-gray-900">{invoice.currency || "INR"}</span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-8 border-b border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 tracking-wider">
                <th className="py-3 px-2">Item Description</th>
                <th className="py-3 px-2 text-center">Qty</th>
                <th className="py-3 px-2 text-right">Unit Price</th>
                <th className="py-3 px-2 text-right">Tax Rate</th>
                <th className="py-3 px-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item: any, idx: number) => (
                  <tr key={item.id || idx}>
                    <td className="py-4 px-2">
                      <div className="font-semibold text-gray-900">
                        {item.description || item.product?.name || "Subscription Service"}
                      </div>
                      {item.product?.code && (
                        <span className="text-xs text-gray-400">SKU: {item.product.code}</span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-4 px-2 text-right text-gray-600">
                      {formatINR(item.unitPriceMinor)}
                    </td>
                    <td className="py-4 px-2 text-right text-gray-600">
                      {item.taxRateBps ? `${item.taxRateBps / 100}%` : "0%"}
                    </td>
                    <td className="py-4 px-2 text-right font-medium text-gray-900">
                      {formatINR(item.totalAmountMinor || item.amountMinor)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">
                    No individual line items recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Breakdown */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-start gap-8">
          <div className="max-w-xs space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Payment Terms & Notes
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Thank you for choosing Brightloop. Invoices are due by the specified date. All
              calculations use integer minor units (paise) with GST regulatory compliance.
            </p>
            {invoice.discountApplications && invoice.discountApplications.length > 0 && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-xs text-emerald-800">
                <span className="font-semibold">Discount Applied:</span>{" "}
                {invoice.discountApplications[0].discount?.name} (Code:{" "}
                {invoice.discountApplications[0].discount?.code})
              </div>
            )}
          </div>

          <div className="w-full sm:w-80 space-y-2.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-medium text-gray-900">
                {formatINR(invoice.subtotalAmountMinor)}
              </span>
            </div>

            {Number(invoice.discountAmountMinor || 0) > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Promotional Discount:</span>
                <span>-{formatINR(invoice.discountAmountMinor)}</span>
              </div>
            )}

            {/* Tax breakdown items */}
            {taxBreakdown.length > 0 ? (
              taxBreakdown.map((t: any, i: number) => (
                <div key={i} className="flex justify-between text-xs text-gray-500">
                  <span>
                    {t.name || t.taxCode} ({t.rateBps / 100}%):
                  </span>
                  <span>{formatINR(t.amountMinor || t.amount)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-gray-600">
                <span>Total Tax (GST):</span>
                <span>{formatINR(invoice.taxAmountMinor)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
              <span className="text-base font-bold text-gray-900">Total Invoiced:</span>
              <span className="text-xl font-black text-gray-900">
                {formatINR(invoice.totalAmountMinor)}
              </span>
            </div>

            <div className="flex justify-between text-emerald-600 font-semibold pt-1">
              <span>Amount Paid:</span>
              <span>{formatINR(invoice.amountPaidMinor)}</span>
            </div>

            <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between items-baseline">
              <span className="font-bold text-gray-900">Balance Due:</span>
              <span
                className={`text-lg font-black ${
                  balanceDue > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {formatINR(invoice.balanceDueMinor)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment History / Allocations Table */}
        {invoice.paymentAllocations && invoice.paymentAllocations.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2 text-emerald-600" />
              Settlement Ledger / Payment History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-gray-100 rounded-lg">
                <thead className="bg-gray-50 text-gray-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Payment Reference</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Allocated Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.paymentAllocations.map((alloc: any) => (
                    <tr key={alloc.id}>
                      <td className="py-2.5 px-3 text-gray-600">
                        {alloc.createdAt ? new Date(alloc.createdAt).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-gray-900">
                        {alloc.payment?.paymentReference || "N/A"}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {alloc.payment?.paymentMethod || "CARD"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                        {formatINR(alloc.allocatedAmountMinor)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          Applied
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pay Invoice Demo Modal */}
      {isPayModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPayModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Pay Outstanding Balance</h3>
                  <p className="text-xs text-gray-500">Invoice: {invoice.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentSuccessData ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Payment Successful!</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Your payment of{" "}
                  <span className="font-bold text-gray-900">
                    {formatINR(paymentSuccessData.payment?.amountMinor)}
                  </span>{" "}
                  has been simulated, recorded, and allocated directly to this invoice.
                </p>
                <div className="p-3 bg-gray-50 rounded-xl font-mono text-xs text-gray-700 text-left space-y-1">
                  <div>
                    <span className="text-gray-400">Transaction ID:</span>{" "}
                    {paymentSuccessData.payment?.paymentReference}
                  </div>
                  <div>
                    <span className="text-gray-400">Method:</span>{" "}
                    {paymentSuccessData.payment?.paymentMethod}
                  </div>
                  <div>
                    <span className="text-gray-400">New Status:</span>{" "}
                    <span className="text-emerald-600 font-semibold">
                      {paymentSuccessData.updatedInvoice?.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsPayModalOpen(false)}
                  className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="py-4 space-y-5">
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-800 font-medium block">
                      Payable Amount
                    </span>
                    <span className="text-2xl font-black text-emerald-700">
                      {formatINR(invoice.balanceDueMinor)}
                    </span>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-semibold">
                    Full Settlement
                  </span>
                </div>

                {/* Demo Payment Notice */}
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Demo Payment Simulator</span>
                    <p className="text-amber-700 mt-0.5">
                      This simulates an authorized payment gateway without collecting real bank credentials.
                    </p>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("UPI")}
                      className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                        paymentMethod === "UPI"
                          ? "border-emerald-600 bg-emerald-50/40 text-emerald-700 font-semibold ring-1 ring-emerald-600"
                          : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      <Smartphone className="w-5 h-5 mb-1" />
                      <span className="text-xs">UPI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CARD")}
                      className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                        paymentMethod === "CARD"
                          ? "border-emerald-600 bg-emerald-50/40 text-emerald-700 font-semibold ring-1 ring-emerald-600"
                          : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mb-1" />
                      <span className="text-xs">Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("BANK_TRANSFER")}
                      className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                        paymentMethod === "BANK_TRANSFER"
                          ? "border-emerald-600 bg-emerald-50/40 text-emerald-700 font-semibold ring-1 ring-emerald-600"
                          : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      <Building className="w-5 h-5 mb-1" />
                      <span className="text-xs">Net Banking</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handlePayInvoice}
                    disabled={paying}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {paying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing Payment...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Pay {formatINR(invoice.balanceDueMinor)} Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
