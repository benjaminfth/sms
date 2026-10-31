"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, formatMinor } from "@/lib/api-client";
import { Plus, Trash2, ArrowLeft, Check, Sparkles } from "lucide-react";
import Link from "next/link";

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  priceAdjustmentMinor: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  baseSellingPriceMinor: string;
  variants: ProductVariant[];
}

interface Customer {
  id: string;
  fullName: string;
  companyName?: string;
  currency: string;
}

interface QuotationTemplate {
  id: string;
  name: string;
  description?: string;
}

interface LineItemForm {
  productId: string;
  productVariantId: string;
  quantity: string;
  unitPriceMinor: string;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItemForm[]>([
    { productId: "", productVariantId: "", quantity: "1.000", unitPriceMinor: "" },
  ]);

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [customersData, productsData, templatesData] = await Promise.all([
          api.get<any[]>("/customers"),
          api.get<any[]>("/products"),
          api.get<any[]>("/quotation-templates").catch(() => []),
        ]);
        setCustomers(customersData || []);
        setProducts(productsData || []);
        setTemplates(templatesData || []);

        if (customersData && customersData.length > 0) {
          setCustomerId(customersData[0].id);
        }
        if (productsData && productsData.length > 0) {
          const firstProd = productsData[0];
          setItems([
            {
              productId: firstProd.id,
              productVariantId: firstProd.variants?.[0]?.id || "",
              quantity: "1.000",
              unitPriceMinor: firstProd.baseSellingPriceMinor,
            },
          ]);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load catalog data");
      } finally {
        setLoading(false);
      }
    };

    loadPrerequisites();
  }, []);

  const handleTemplateChange = (tmplId: string) => {
    setTemplateId(tmplId);
    if (!tmplId) return;
    const selected = templates.find((t) => t.id === tmplId);
    if (selected?.description) {
      setNotes(selected.description);
    }
  };

  const handleProductChange = (index: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    const updated = [...items];
    const item = updated[index];
    if (item && prod) {
      item.productId = prod.id;
      item.productVariantId = prod.variants?.[0]?.id || "";
      const base = BigInt(prod.baseSellingPriceMinor || "0");
      const surcharge = prod.variants?.[0] ? BigInt(prod.variants[0].priceAdjustmentMinor || "0") : 0n;
      item.unitPriceMinor = (base + surcharge).toString();
    }
    setItems(updated);
  };

  const handleVariantChange = (index: number, newVariantId: string) => {
    const updated = [...items];
    const item = updated[index];
    if (item) {
      item.productVariantId = newVariantId;
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        const base = BigInt(prod.baseSellingPriceMinor || "0");
        const variant = prod.variants.find((v) => v.id === newVariantId);
        const surcharge = variant ? BigInt(variant.priceAdjustmentMinor || "0") : 0n;
        item.unitPriceMinor = (base + surcharge).toString();
      }
    }
    setItems(updated);
  };

  const updateItemField = (index: number, field: keyof LineItemForm, value: string) => {
    const updated = [...items];
    const item = updated[index];
    if (item) {
      item[field] = value;
    }
    setItems(updated);
  };

  const addItem = () => {
    const firstProd = products[0];
    if (!firstProd) return;
    const base = BigInt(firstProd.baseSellingPriceMinor || "0");
    const surcharge = firstProd.variants?.[0] ? BigInt(firstProd.variants[0].priceAdjustmentMinor || "0") : 0n;
    setItems([
      ...items,
      {
        productId: firstProd.id,
        productVariantId: firstProd.variants?.[0]?.id || "",
        quantity: "1.000",
        unitPriceMinor: (base + surcharge).toString(),
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Live total preview
  const estimatedTotalMinor = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = BigInt(item.unitPriceMinor || "0");
    const scaled = BigInt(Math.round(qty * 1000));
    return sum + (scaled * price) / 1000n;
  }, 0n);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError("Please select a customer");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one line item");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        customerId,
        templateId: templateId || undefined,
        validUntil: new Date(`${validUntil}T23:59:59.000Z`).toISOString(),
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          productVariantId: i.productVariantId || undefined,
          quantity: i.quantity,
          unitPriceMinor: i.unitPriceMinor || undefined,
        })),
      };

      const result = await api.post<any>("/quotations", payload);
      router.push(`/quotations/${result.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create quotation");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
        <p className="text-sm">Loading quotation builder...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link
          href="/quotations"
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Quotation</h1>
          <p className="text-sm text-slate-500">
            Generate a formal commercial proposal for software licenses and recurring subscriptions
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Template Configuration Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center">
            <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
            Commercial Parameters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Customer *
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} {c.companyName ? `(${c.companyName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Quotation Template (Optional)
              </label>
              <select
                value={templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No template (Custom terms)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Offer Valid Until *
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Line Items Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-slate-900">Products & Scope</h2>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Product
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const selectedProduct = products.find((p) => p.id === item.productId);
              const variants = selectedProduct?.variants || [];

              return (
                <div
                  key={index}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-xs text-slate-500 mb-1">Product</label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductChange(index, e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs text-slate-500 mb-1">Variant</label>
                    <select
                      value={item.productVariantId}
                      onChange={(e) => handleVariantChange(index, e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                      disabled={variants.length === 0}
                    >
                      <option value="">Base Product</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} (+₹{(parseInt(v.priceAdjustmentMinor, 10) / 100).toFixed(0)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Quantity</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemField(index, "quantity", e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Unit Price (Paise)</label>
                    <input
                      type="number"
                      value={item.unitPriceMinor}
                      onChange={(e) => updateItemField(index, "unitPriceMinor", e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                      className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Preview Subtotal */}
          <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-slate-700">
            <span className="text-sm font-medium">Estimated Quotation Subtotal:</span>
            <span className="text-xl font-bold text-slate-900">
              {formatMinor(estimatedTotalMinor.toString())}
            </span>
          </div>
        </div>

        {/* Terms and Notes Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-3">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Commercial Notes & Terms
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Specify commercial payment terms, scope, service level agreements (SLAs)..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Link
            href="/quotations"
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            <Check className="w-4 h-4 mr-2" />
            {submitting ? "Creating..." : "Save Draft Quotation"}
          </button>
        </div>
      </form>
    </div>
  );
}

