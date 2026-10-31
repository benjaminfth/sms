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
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [validityDays, setValidityDays] = useState(15);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("NET_15");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Confirm delete dialog state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<QuotationTemplateDTO[]>("/quotation-templates", {
        page,
        pageSize: 15,
      });
      if (res.data) {
        setTemplates(res.data);
      }
      if (res.meta) {
        setPagination(res.meta);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load quotation templates");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
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
      setErrorMsg(err.message || "Failed to create template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await api.delete(`/quotation-templates/${deleteTargetId}`);
      setDeleteTargetId(null);
      fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete template");
    }
  };

  const columns: Column<QuotationTemplateDTO>[] = [
    {
      header: "Template Name",
      cell: (item) => (
        <div>
          <span className="font-medium text-text-primary block text-[13px]">{item.name}</span>
          {item.description && (
            <span className="text-[12px] text-text-secondary line-clamp-1 mt-0.5">
              {item.description}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Validity",
      cell: (item) => (
        <span className="inline-flex items-center text-[12px] font-medium text-text-secondary bg-surface-canvas border border-border px-2 py-0.5 rounded-sm">
          <Clock className="w-3 h-3 mr-1 text-text-muted" />
          {item.config?.validityDays ?? 15} Days
        </span>
      ),
    },
    {
      header: "Payment Terms",
      cell: (item) => (
        <span className="inline-flex items-center text-[12px] font-medium text-primary-accent bg-primary-accent/10 px-2 py-0.5 rounded-sm border border-primary-accent/20">
          <FileText className="w-3 h-3 mr-1" />
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
        <span className="text-[12px] text-text-muted font-mono">{formatDate(item.createdAt)}</span>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (item) => (
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setDeleteTargetId(item.id)}
            className="p-1 rounded-btn text-text-muted hover:text-status-danger hover:bg-surface-canvas transition-colors"
            title="Delete Template"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Quotation Templates"
        description="Manage standard terms, validity periods, payment conditions, and templates for sales quotations."
        actions={
          <div className="flex items-center space-x-2">
            <Link
              href="/admin/quotations"
              className="inline-flex items-center px-3 py-1.5 border border-border rounded-btn text-[13px] font-medium text-text-primary bg-surface-card hover:bg-surface-canvas transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Quotations
            </Link>
            <button
              onClick={() => {
                setErrorMsg(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center px-3.5 py-1.5 rounded-btn text-[13px] font-medium text-white bg-primary-accent hover:bg-primary-hover transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Template
            </button>
          </div>
        }
      />

      {errorMsg && (
        <div className="mb-5 p-3 rounded-btn bg-status-danger/10 border border-status-danger/20 text-[12px] text-status-danger font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-surface-card rounded-card border border-border shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={templates}
          pagination={pagination}
          onPageChange={(p) => setPage(p)}
          loading={loading}
        />
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <div className="bg-surface-card rounded-dialog shadow-xl w-full max-w-lg p-6 border border-border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
              <h3 className="text-[15px] font-semibold text-text-primary">
                Create Quotation Template
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-btn hover:bg-surface-canvas"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Annual SLA Package"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-border rounded-input px-3.5 py-2 text-[13px] bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-text-primary mb-1">
                    Validity (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                    className="w-full border border-border rounded-input px-3.5 py-2 text-[13px] bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-text-primary mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                    className="w-full border border-border rounded-input px-3.5 py-2 text-[13px] bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
                  >
                    <option value="DUE_IMMEDIATELY">Due Immediately</option>
                    <option value="NET_7">Net 7 Days</option>
                    <option value="NET_15">Net 15 Days</option>
                    <option value="NET_30">Net 30 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Summary / Description
                </label>
                <input
                  type="text"
                  placeholder="Short description for sales team..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-border rounded-input px-3.5 py-2 text-[13px] bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Default Terms & Conditions
                </label>
                <textarea
                  rows={3}
                  placeholder="Terms, payment conditions, SLA guarantees..."
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="w-full border border-border rounded-input p-3 text-[13px] bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-[12px] font-medium text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center px-4 py-2 text-[12px] font-medium rounded-btn text-white bg-primary-accent hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submitting ? "Creating..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete Template"
        description="Are you sure you want to delete this quotation template? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </DashboardShell>
  );
}
