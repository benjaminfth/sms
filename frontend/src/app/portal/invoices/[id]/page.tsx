"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
        if (res.data.updatedInvoice) {
          setInvoice(res.data.updatedInvoice);
        }
      } else {
        alert(res.error?.message || "Payment simulation failed.");
      }
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred during payment processing.");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-text-secondary">
        Loading invoice document...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <AlertTriangle className="w-10 h-10 text-status-danger mx-auto mb-3" />
        <h2 className="text-[18px] font-semibold text-text-primary">Failed to load invoice</h2>
        <p className="text-[13px] text-text-secondary mt-1">{error || "The requested invoice could not be found."}</p>
        <Link
          href="/portal/invoices"
          className="mt-5 inline-flex items-center px-4 py-2 rounded-btn text-[13px] font-medium text-white bg-primary-accent hover:bg-primary-hover shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Invoices
        </Link>
      </div>
    );
  }

  const balanceDue = Number(invoice.balanceDueMinor || 0);
  const isPayable = balanceDue > 0 && invoice.status !== "VOID" && invoice.status !== "CANCELLED";

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
          className="inline-flex items-center text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to All Invoices
        </Link>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-3.5 py-1.5 border border-border rounded-btn text-[13px] font-medium text-text-primary bg-surface-card hover:bg-surface-canvas shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / Save PDF
          </button>
          {isPayable && (
            <button
              onClick={() => {
                setPaymentSuccessData(null);
                setIsPayModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-1.5 rounded-btn text-[13px] font-medium text-white bg-primary-accent hover:bg-primary-hover shadow-xs transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              Pay {formatINR(invoice.balanceDueMinor)}
            </button>
          )}
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="bg-surface-card rounded-card border border-border shadow-xs overflow-hidden p-8 sm:p-12 print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-8 border-b border-border gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-btn bg-primary-accent flex items-center justify-center text-white shadow-xs">
                <div className="w-3.5 h-3.5 border-2 border-white rounded-[3px] rotate-45 flex items-center justify-center">
                  <div className="w-1 h-1 bg-white rounded-full" />
                </div>
              </div>
              <span className="text-[17px] font-semibold text-text-primary tracking-tight">
                Brightloop SMS
              </span>
            </div>
            <p className="text-[12px] text-text-secondary">Subscription & Billing Platform</p>
            <p className="text-[11px] text-text-muted mt-0.5">GSTIN: 29AABCU9603R1ZM</p>
            <p className="text-[11px] text-text-muted">support@brightloop.io | billing.brightloop.io</p>
          </div>

          <div className="text-left sm:text-right">
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">TAX INVOICE</h1>
            <p className="text-[13px] font-mono font-medium text-primary-accent mt-0.5">{invoice.invoiceNumber}</p>
            <div className="mt-2">
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Invoice Metadata & Customer Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-b border-border text-[13px]">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted block mb-1.5">
              Billed To
            </span>
            <p className="font-semibold text-text-primary text-[14px]">{invoice.customer?.fullName}</p>
            {invoice.customer?.companyName && (
              <p className="text-text-secondary font-medium">{invoice.customer.companyName}</p>
            )}
            <p className="text-text-secondary mt-0.5">{invoice.customer?.email}</p>
            {invoice.customer?.phone && (
              <p className="text-text-muted font-mono text-[12px]">{invoice.customer.phone}</p>
            )}
            {invoice.customer?.billingAddressLine1 && (
              <p className="text-text-secondary mt-1">
                {invoice.customer.billingAddressLine1}
                {invoice.customer.billingAddressLine2 && `, ${invoice.customer.billingAddressLine2}`}
                <br />
                {invoice.customer.city}, {invoice.customer.state} - {invoice.customer.postalCode}
              </p>
            )}
            {invoice.customer?.gstOrTaxId && (
              <p className="text-[11px] text-text-muted font-mono mt-1.5">
                Customer GSTIN / Tax ID: {invoice.customer.gstOrTaxId}
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-1.5">
            <div>
              <span className="text-[12px] text-text-secondary">Issue Date:</span>
              <span className="ml-2 font-mono font-medium text-text-primary">
                {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString("en-IN") : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-[12px] text-text-secondary">Payment Due:</span>
              <span className="ml-2 font-mono font-medium text-status-warning">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "Immediate"}
              </span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6 border-b border-border">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] font-medium uppercase text-text-muted tracking-wider">
                <th className="py-2.5 px-2">Description</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-2 text-right">Unit Price</th>
                <th className="py-2.5 px-2 text-right">Tax Rate</th>
                <th className="py-2.5 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-3 px-2">
                      <div className="font-medium text-text-primary">
                        {item.description || item.product?.name || "Subscription Service"}
                      </div>
                      {item.product?.sku && (
                        <span className="text-[11px] font-mono text-text-muted">SKU: {item.product.sku}</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-text-secondary">{item.quantity}</td>
                    <td className="py-3 px-2 text-right font-mono text-text-secondary">
                      {formatINR(item.unitPriceMinor)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-text-secondary">
                      {item.taxRateBps ? `${item.taxRateBps / 100}%` : "0%"}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-medium text-text-primary">
                      {formatINR(item.totalAmountMinor || item.amountMinor)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-text-muted">
                    No itemized lines in this invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Breakdown */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between items-start gap-8">
          <div className="max-w-xs space-y-2">
            <h4 className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              Payment Terms & Instructions
            </h4>
            <p className="text-[12px] text-text-secondary leading-relaxed">
              Payment due upon receipt. Electronic payment receipts are automatically attached to customer accounts.
            </p>
          </div>

          <div className="w-full sm:w-80 space-y-2 text-[13px]">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal:</span>
              <span className="font-mono text-text-primary">
                {formatINR(invoice.subtotalAmountMinor)}
              </span>
            </div>

            {Number(invoice.discountAmountMinor || 0) > 0 && (
              <div className="flex justify-between text-status-success font-medium">
                <span>Discount Applied:</span>
                <span className="font-mono">-{formatINR(invoice.discountAmountMinor)}</span>
              </div>
            )}

            {/* Tax breakdown items */}
            {taxBreakdown.length > 0 ? (
              taxBreakdown.map((t: any, i: number) => (
                <div key={i} className="flex justify-between text-[12px] text-text-muted">
                  <span>
                    {t.name || t.taxCode} ({t.rateBps / 100}%):
                  </span>
                  <span className="font-mono">{formatINR(t.amountMinor || t.amount)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-text-secondary">
                <span>Total Tax (GST):</span>
                <span className="font-mono text-text-primary">{formatINR(invoice.taxAmountMinor)}</span>
              </div>
            )}

            <div className="pt-2.5 border-t border-border flex justify-between items-baseline">
              <span className="text-[14px] font-semibold text-text-primary">Total Invoiced:</span>
              <span className="text-[18px] font-semibold text-text-primary font-mono tracking-tight">
                {formatINR(invoice.totalAmountMinor)}
              </span>
            </div>

            <div className="flex justify-between text-status-success font-medium pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono">{formatINR(invoice.amountPaidMinor)}</span>
            </div>

            <div className="pt-2 border-t border-dashed border-border flex justify-between items-baseline">
              <span className="font-semibold text-text-primary">Balance Due:</span>
              <span
                className={`text-[17px] font-semibold font-mono tracking-tight ${
                  balanceDue > 0 ? "text-status-danger" : "text-status-success"
                }`}
              >
                {formatINR(invoice.balanceDueMinor)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment History / Allocations Table */}
        {invoice.paymentAllocations && invoice.paymentAllocations.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-3 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-status-success" />
              Settlement Ledger / Payment History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px] border border-border rounded-btn">
                <thead className="bg-surface-canvas text-text-muted uppercase text-[10px] font-medium tracking-wider">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Payment Reference</th>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3 text-right">Allocated Amount</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.paymentAllocations.map((alloc: any) => (
                    <tr key={alloc.id}>
                      <td className="py-2 px-3 font-mono text-text-secondary">
                        {alloc.createdAt ? new Date(alloc.createdAt).toLocaleDateString("en-IN") : "N/A"}
                      </td>
                      <td className="py-2 px-3 font-mono font-medium text-text-primary">
                        {alloc.payment?.paymentReference || "N/A"}
                      </td>
                      <td className="py-2 px-3 text-text-secondary">
                        {alloc.payment?.paymentMethod || "CARD"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-status-success">
                        {formatINR(alloc.allocatedAmountMinor)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-badge text-[10px] font-medium bg-status-success/10 text-status-success border border-status-success/20">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-surface-card rounded-dialog max-w-md w-full p-6 shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-btn bg-status-success/10 text-status-success">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary text-[15px]">Pay Outstanding Balance</h3>
                  <p className="text-[12px] font-mono text-text-muted">{invoice.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {paymentSuccessData ? (
              <div className="py-5 text-center space-y-3.5">
                <div className="w-12 h-12 bg-status-success/15 text-status-success rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
                </div>
                <h4 className="text-[17px] font-semibold text-text-primary">Payment Successful</h4>
                <p className="text-[12px] text-text-secondary max-w-xs mx-auto">
                  Payment of{" "}
                  <span className="font-semibold text-text-primary font-mono">
                    {formatINR(paymentSuccessData.payment?.amountMinor)}
                  </span>{" "}
                  has been simulated, recorded, and settled against this invoice.
                </p>
                <div className="p-3 bg-surface-canvas rounded-btn border border-border font-mono text-[12px] text-text-primary text-left space-y-1">
                  <div>
                    <span className="text-text-muted font-sans text-[11px]">Txn Ref:</span>{" "}
                    {paymentSuccessData.payment?.paymentReference}
                  </div>
                  <div>
                    <span className="text-text-muted font-sans text-[11px]">Method:</span>{" "}
                    {paymentSuccessData.payment?.paymentMethod}
                  </div>
                  <div>
                    <span className="text-text-muted font-sans text-[11px]">New Status:</span>{" "}
                    <span className="text-status-success font-semibold">
                      {paymentSuccessData.updatedInvoice?.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsPayModalOpen(false)}
                  className="w-full py-2.5 rounded-btn text-[13px] font-medium text-white bg-primary-accent hover:bg-primary-hover shadow-xs transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="py-4 space-y-4">
                <div className="p-3.5 bg-surface-canvas rounded-btn border border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block">
                      Payable Amount
                    </span>
                    <span className="text-[22px] font-semibold text-text-primary font-mono tracking-tight">
                      {formatINR(invoice.balanceDueMinor)}
                    </span>
                  </div>
                  <span className="text-[11px] bg-status-success/10 text-status-success border border-status-success/20 px-2 py-0.5 rounded-badge font-medium">
                    Full Settlement
                  </span>
                </div>

                {/* Demo Payment Notice */}
                <div className="p-3 bg-surface-canvas rounded-btn border border-border text-[12px] text-text-secondary flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-text-primary">Development Payment Gateway</span>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Simulates payment authorization and direct ledger reconciliation without real bank funds transfer.
                    </p>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider block">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("UPI")}
                      className={`p-2.5 rounded-btn border text-center flex flex-col items-center justify-center transition-colors ${
                        paymentMethod === "UPI"
                          ? "border-primary-accent bg-primary-accent/5 text-primary-accent font-medium shadow-xs"
                          : "border-border bg-surface-card hover:bg-surface-canvas text-text-secondary"
                      }`}
                    >
                      <Smartphone className="w-4 h-4 mb-1" />
                      <span className="text-[12px]">UPI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CARD")}
                      className={`p-2.5 rounded-btn border text-center flex flex-col items-center justify-center transition-colors ${
                        paymentMethod === "CARD"
                          ? "border-primary-accent bg-primary-accent/5 text-primary-accent font-medium shadow-xs"
                          : "border-border bg-surface-card hover:bg-surface-canvas text-text-secondary"
                      }`}
                    >
                      <CreditCard className="w-4 h-4 mb-1" />
                      <span className="text-[12px]">Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("BANK_TRANSFER")}
                      className={`p-2.5 rounded-btn border text-center flex flex-col items-center justify-center transition-colors ${
                        paymentMethod === "BANK_TRANSFER"
                          ? "border-primary-accent bg-primary-accent/5 text-primary-accent font-medium shadow-xs"
                          : "border-border bg-surface-card hover:bg-surface-canvas text-text-secondary"
                      }`}
                    >
                      <Building className="w-4 h-4 mb-1" />
                      <span className="text-[12px]">Net Banking</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handlePayInvoice}
                    disabled={paying}
                    className="w-full py-2.5 rounded-btn text-[13px] font-medium text-white bg-primary-accent hover:bg-primary-hover disabled:opacity-50 shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {paying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing Payment...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm & Authorize {formatINR(invoice.balanceDueMinor)}</span>
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
