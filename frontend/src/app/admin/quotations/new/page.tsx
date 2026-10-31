"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { CustomerDTO, ProductDTO, QuotationTemplateDTO } from "@sms/shared";
import { formatMinorToCurrency } from "@sms/shared";
import { ArrowLeft, Plus, Trash2, Save, Sparkles } from "lucide-react";

interface ItemRow {
  productId: string;
  productVariantId?: string;
  description: string;
  quantity: string;
  unitPriceMinor: string;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplateDTO[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    { productId: "", productVariantId: "", description: "", quantity: "1.000", unitPriceMinor: "0" },
  ]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [custRes, prodRes, tmplRes] = await Promise.all([
          api.get<CustomerDTO[]>("/customers", { pageSize: 100 }),
          api.get<ProductDTO[]>("/products", { pageSize: 100 }),
          api.get<QuotationTemplateDTO[]>("/quotation-templates", { pageSize: 50 }),
        ]);

        if (custRes.data) setCustomers(custRes.data);
        if (prodRes.data) setProducts(prodRes.data);
        if (tmplRes.data) setTemplates(tmplRes.data);
      } catch (err: any) {
        setError(err.message || "Failed to load master data");
      } finally {
        setLoadingInitial(false);
      }
    }
    loadInitialData();
  }, []);

  const handleProductChange = (index: number, selectedProductId: string) => {
    const prod = products.find((p) => p.id === selectedProductId);
    const updated = [...items];
    if (prod && updated[index]) {
      updated[index].productId = prod.id;
      updated[index].productVariantId = "";
      updated[index].description = prod.name;
      updated[index].unitPriceMinor = prod.baseSellingPriceMinor;
      setItems(updated);
    }
  };

  const handleVariantChange = (index: number, selectedVariantId: string) => {
    const updated = [...items];
    const row = updated[index];
    if (!row) return;

    const prod = products.find((p) => p.id === row.productId);
    if (!prod) return;

    row.productVariantId = selectedVariantId;
    if (selectedVariantId) {
      const variant = prod.variants?.find((v) => v.id === selectedVariantId);
      if (variant) {
        row.description = `${prod.name} - ${variant.name}`;
        const base = BigInt(prod.baseSellingPriceMinor);
        const surcharge = BigInt(variant.priceAdjustmentMinor);
        row.unitPriceMinor = (base + surcharge).toString();
      }
    } else {
      row.description = prod.name;
      row.unitPriceMinor = prod.baseSellingPriceMinor;
    }
    setItems(updated);
  };

  const handleQuantityChange = (index: number, qty: string) => {
    const updated = [...items];
    if (updated[index]) {
      updated[index].quantity = qty;
      setItems(updated);
    }
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { productId: "", productVariantId: "", description: "", quantity: "1.000", unitPriceMinor: "0" },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((acc, it) => {
      const price = BigInt(it.unitPriceMinor || "0");
      const qtyNum = parseFloat(it.quantity) || 1.0;
      const qtyBasis = BigInt(Math.round(qtyNum * 1000));
      return acc + (price * qtyBasis) / BigInt(1000);
    }, BigInt(0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError("Please select a customer");
      return;
    }

    const validItems = items.filter((it) => it.productId);
    if (validItems.length === 0) {
      setError("Please add at least one valid product line item");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId,
        templateId: templateId || undefined,
        validUntil: new Date(`${validUntil}T23:59:59.000Z`).toISOString(),
        notes: notes || undefined,
        discountCode: discountCode ? discountCode.trim() : undefined,
        items: validItems.map((it) => ({
          productId: it.productId,
          productVariantId: it.productVariantId || undefined,
          description: it.description,
          quantity: it.quantity,
          unitPriceMinor: it.unitPriceMinor,
        })),
      };

      const res = await api.post<any>("/quotations", payload);
      if (res.success && res.data) {
        router.push(`/admin/quotations/${res.data.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create quotation");
      setSubmitting(false);
    }
  };

  const subtotal = calculateSubtotal();

  return (
    <DashboardShell>
      <PageHeader
        title="Create New Quotation"
        description="Generate a commercial quote for an existing customer."
      >
        <Link
          href="/admin/quotations"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Quotations
        </Link>
      </PageHeader>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Customer & General Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Customer <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                disabled={loadingInitial}
              >
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} {c.companyName ? `(${c.companyName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Template (Optional)
              </label>
              <select
                value={templateId}
                onChange={(e) => {
                  setTemplateId(e.target.value);
                  const tmpl = templates.find((t) => t.id === e.target.value);
                  if (tmpl?.description) {
                    setNotes(tmpl.description);
                  }
                }}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="">Select a quotation template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Valid Until <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Discount Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. LAUNCH20"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Terms & Notes
            </label>
            <textarea
              rows={3}
              placeholder="Commercial payment terms, delivery notes, or SLA stipulations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Products & Pricing</h2>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((row, index) => {
              const selectedProduct = products.find((p) => p.id === row.productId);
              const availableVariants = selectedProduct?.variants?.filter((v) => v.isActive) || [];

              return (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-200"
                >
                  <div className="col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Product</label>
                    <select
                      required
                      value={row.productId}
                      onChange={(e) => handleProductChange(index, e.target.value)}
                      className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select a product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatMinorToCurrency(p.baseSellingPriceMinor, p.currency)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Variant (Optional)</label>
                    <select
                      value={row.productVariantId || ""}
                      onChange={(e) => handleVariantChange(index, e.target.value)}
                      disabled={availableVariants.length === 0}
                      className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                    >
                      <option value="">Base Product</option>
                      {availableVariants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} (+{formatMinorToCurrency(v.priceAdjustmentMinor)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Quantity</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={row.quantity}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="col-span-1 text-right">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Unit Price</label>
                    <span className="text-xs font-semibold text-slate-800 font-mono block py-1.5">
                      {formatMinorToCurrency(row.unitPriceMinor)}
                    </span>
                  </div>

                  <div className="col-span-1 text-center pt-5">
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      disabled={items.length <= 1}
                      className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subtotal Preview */}
          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <div className="w-64 space-y-1.5 text-right">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Estimated Subtotal:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {formatMinorToCurrency(subtotal)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Taxes (e.g. 18% GST) and discounts will be calculated precisely on quotation creation.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-3">
          <Link
            href="/admin/quotations"
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-5 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {submitting ? "Saving..." : "Create Quotation"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
