"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import { CustomerDTO, ProductDTO, QuotationTemplateDTO } from "@sms/shared";
import { formatMinorToCurrency } from "@sms/shared";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

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
      setError("Please select a customer.");
      return;
    }

    const validItems = items.filter((it) => it.productId);
    if (validItems.length === 0) {
      setError("Please add at least one valid product line item.");
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
      <div className="mb-4">
        <Link
          href="/admin/quotations"
          className="inline-flex items-center text-[12px] font-medium text-[#64748B] hover:text-[#172033] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Quotations
        </Link>
      </div>

      <PageHeader
        title="New Quotation"
        description="Draft a formal commercial proposal with itemized pricing and terms."
      />

      {error && (
        <div className="bg-[#FDEDED] border border-[#F8C6C6] text-[#D14343] px-3.5 py-2.5 rounded-[8px] mb-6 text-[12px] font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Customer & General Section */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs space-y-4">
          <h2 className="text-[14px] font-semibold text-[#172033] pb-3 border-b border-[#E5EAF1]">
            Customer & General Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Customer <span className="text-[#D14343]">*</span>
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
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
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Quotation Template (Optional)
              </label>
              <select
                value={templateId}
                onChange={(e) => {
                  setTemplateId(e.target.value);
                  const tmpl = templates.find((t) => t.id === e.target.value);
                  if (tmpl?.description) setNotes(tmpl.description);
                }}
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Valid Until <span className="text-[#D14343]">*</span>
              </label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Discount Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. EARLYBIRD10"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] font-mono uppercase bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#172033] mb-1">
              Terms & Stipulations
            </label>
            <textarea
              rows={2}
              placeholder="Commercial payment terms, delivery notes, or SLA stipulations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
            />
          </div>
        </div>

        {/* Products & Pricing Section */}
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
            <div>
              <h2 className="text-[14px] font-semibold text-[#172033]">Products & Pricing</h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">Itemize quoted services and quantities</p>
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center px-2.5 py-1 text-[12px] font-medium rounded-[6px] bg-[#F8FAFC] border border-[#E5EAF1] hover:bg-[#EFF4FE] hover:text-[#315CF5] text-[#172033] transition"
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
                  className="flex flex-col sm:flex-row items-center gap-3 bg-[#F8FAFC] p-3 rounded-[8px] border border-[#E5EAF1]"
                >
                  <div className="w-full sm:flex-1">
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">Product</label>
                    <select
                      required
                      value={row.productId}
                      onChange={(e) => handleProductChange(index, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033]"
                    >
                      <option value="">Select a product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatMinorToCurrency(p.baseSellingPriceMinor, p.currency)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-44">
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">Variant</label>
                    <select
                      value={row.productVariantId || ""}
                      onChange={(e) => handleVariantChange(index, e.target.value)}
                      disabled={availableVariants.length === 0}
                      className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033] disabled:opacity-50"
                    >
                      <option value="">Base Product</option>
                      {availableVariants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} (+{formatMinorToCurrency(v.priceAdjustmentMinor)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-20">
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">Qty</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={row.quantity}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[12px] font-mono bg-white border border-[#E5EAF1] rounded-[6px] text-[#172033]"
                    />
                  </div>

                  <div className="w-full sm:w-32 text-right">
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">Unit Price</label>
                    <span className="text-[13px] font-mono font-medium text-[#172033] block py-1.5">
                      {formatMinorToCurrency(row.unitPriceMinor)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-[#94A3B8] hover:text-[#D14343] hover:bg-[#FDEDED] rounded-[6px] transition sm:mt-5 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#E5EAF1] flex justify-end">
            <div className="text-right">
              <span className="text-[12px] text-[#64748B] mr-2">Estimated Subtotal:</span>
              <span className="font-mono font-semibold text-[15px] text-[#172033]">
                {formatMinorToCurrency(subtotal)}
              </span>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">
                GST and discounts calculated upon saving quotation.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-2.5 pt-2">
          <Link
            href="/admin/quotations"
            className="px-4 py-2 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px] transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] rounded-[8px] shadow-xs transition disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Save Quotation"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
