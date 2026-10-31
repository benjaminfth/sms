"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { api } from "@/lib/api-client";
import { QuotationTemplateDTO, PaginationMeta, PaymentTerms } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2, ArrowLeft, X, Clock, FileText } from "lucide-react";

export default function QuotationTemplatesPage() {
  const [templates, setTemplates] = useState<QuotationTemplateDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [validityDays, setValidityDays] = useState(15);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("NET_15");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Confirm delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    templateId: string;
    name: string;
  }>({
    isOpen: false,
    templateId: "",
    name: "",
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<QuotationTemplateDTO[]>("/quotation-templates", {
        page,
        pageSize: 10,
      });
      if (res.success && res.data) {
        setTemplates(res.data);
        setPagination(res.meta);
      }
    } catch (err) {
      console.error("Failed to load quotation templates:", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await api.post("/quotation-templates", {
        name: name.trim(),
        description: description.trim() || undefined,
        validityDays: Number(validityDays) || 15,
        paymentTerms,
        termsAndConditions: termsAndConditions.trim() || undefined,
        isActive: true,
      });
      setName("");
      setDescription("");
      setValidityDays(15);
      setPaymentTerms("NET_15");
      setTermsAndConditions("");
      setShowCreateModal(false);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || "Failed to create quotation template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/quotation-templates/${deleteDialog.templateId}`);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || "Failed to delete quotation template");
    }
  };

  const columns: Column<QuotationTemplateDTO>[] = [
    {
      header: "Template Name",
      cell: (item) => (
        <div>
          <span className="font-semibold text-slate-900 block">{item.name}</span>
          {item.description && (
            <span className="text-xs text-slate-500 line-clamp-1">
              {item.description}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Validity",
      cell: (item) => (
        <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          <Clock className="w-3 h-3 mr-1 text-slate-500" />
          {item.config?.validityDays ?? 15} Days
        </span>
      ),
    },
    {
      header: "Payment Terms",
      cell: (item) => (
        <span className="inline-flex items-center text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          <FileText className="w-3 h-3 mr-1 text-blue-500" />
          {item.config?.paymentTerms?.replace("_", " ") ?? "NET 15"}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (item) => <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      header: "Created",
      cell: (item) => (
        <span className="text-xs text-slate-600 font-mono">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (item) => (
        <button
          onClick={() =>
            setDeleteDialog({
              isOpen: true,
              templateId: item.id,
              name: item.name,
            })
          }
          className="text-slate-400 hover:text-rose-600 p-1"
          title="Delete Template"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Quotation Templates"
        description="Manage standard terms, validity periods, payment conditions, and templates for quotations."
      >
        <div className="flex items-center space-x-2">
          <Link
            href="/admin/quotations"
            className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Quotations
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-3.5 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </button>
        </div>
      </PageHeader>

      <DataTable
        columns={columns}
        data={templates}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-semibold text-slate-900">New Quotation Template</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Template Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Annual SLA Package"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Validity (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="DUE_IMMEDIATELY">Due Immediately</option>
                    <option value="NET_7">Net 7 Days</option>
                    <option value="NET_15">Net 15 Days</option>
                    <option value="NET_30">Net 30 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Summary / Description
                </label>
                <input
                  type="text"
                  placeholder="Short description for sales team..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Default Terms & Conditions
                </label>
                <textarea
                  rows={3}
                  placeholder="Terms, payment conditions, SLA guarantees..."
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Quotation Template"
        description={`Are you sure you want to delete template "${deleteDialog.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </DashboardShell>
  );
}
