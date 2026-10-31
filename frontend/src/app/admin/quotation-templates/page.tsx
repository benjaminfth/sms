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
            <span className="text-xs text-slate-500 whitespace-pre-line line-clamp-2">
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
        description="Manage standard terms, conditions, and templates for sales quotations."
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
                  placeholder="e.g. Standard SaaS Net 30"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Default Terms & Conditions
                </label>
                <textarea
                  rows={4}
                  placeholder="Default payment terms, validity notes, SLA descriptions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
