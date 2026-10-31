"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { api } from "@/lib/api-client";
import { QuotationTemplateDTO, PaginationMeta } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Plus, LayoutTemplate, Trash2, ArrowLeft, Check, X } from "lucide-react";

export default function QuotationTemplatesPage() {
  const [templates, setTemplates] = useState<QuotationTemplateDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
    setErrorMsg(null);
    try {
      await api.post("/quotation-templates", {
        name: name.trim(),
        description: description.trim() || undefined,
        isActive: true,
      });
      setName("");
      setDescription("");
      setShowCreateModal(false);
      fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create quotation template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/quotation-templates/${deleteDialog.templateId}`);
      setDeleteDialog((prev) => ({ ...prev, isOpen: false }));
      fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete quotation template");
    }
  };

  const columns: Column<QuotationTemplateDTO>[] = [
    {
      header: "Template Name",
      cell: (item) => (
        <div>
          <span className="font-medium text-text-primary block text-[13px]">{item.name}</span>
          {item.description && (
            <span className="text-[12px] text-text-secondary whitespace-pre-line line-clamp-2 mt-0.5">
              {item.description}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      cell: (item) => <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      header: "Created",
      cell: (item) => (
        <span className="text-[12px] text-text-muted font-mono">
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
          className="text-text-muted hover:text-status-danger p-1 rounded-btn transition-colors"
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
        description="Manage standard terms, conditions, and templates for sales quotations."
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
                New Quotation Template
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
                  placeholder="e.g. Standard SaaS Net 30"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-border rounded-input px-3.5 py-2 text-[13px] bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1">
                  Default Terms & Conditions
                </label>
                <textarea
                  rows={4}
                  placeholder="Default payment terms, validity notes, SLA descriptions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-border rounded-input p-3 text-[13px] bg-surface-card text-text-primary focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
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
                  className="px-4 py-2 text-[12px] font-medium text-white bg-primary-accent hover:bg-primary-hover rounded-btn transition-colors disabled:opacity-50 shadow-xs"
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
        description={`Are you sure you want to delete template "${deleteDialog.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </DashboardShell>
  );
}
