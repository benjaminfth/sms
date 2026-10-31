"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { Plus, FileCode, Trash2, Edit2, Check, X } from "lucide-react";

interface QuotationTemplate {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function QuotationTemplatesPage() {
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuotationTemplate | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await api.get<QuotationTemplate[]>("/quotation-templates");
      setTemplates(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setName("");
    setDescription("");
    setError(null);
    setShowCreateModal(true);
  };

  const openEditModal = (tmpl: QuotationTemplate) => {
    setEditingTemplate(tmpl);
    setName(tmpl.name);
    setDescription(tmpl.description || "");
    setError(null);
    setShowCreateModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingTemplate) {
        await api.patch(`/quotation-templates/${editingTemplate.id}`, {
          name,
          description,
        });
      } else {
        await api.post("/quotation-templates", {
          name,
          description,
          isActive: true,
        });
      }
      setShowCreateModal(false);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message || "Failed to save template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await api.delete(`/quotation-templates/${id}`);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || "Failed to delete template");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quotation Templates</h1>
          <p className="text-sm text-slate-500">
            Standard terms, validity periods, and commercial boilerplate presets for sales teams
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </button>
      </div>

      {/* Templates List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
            <p className="text-sm">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center">
            <FileCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No quotation templates</h3>
            <p className="text-sm text-slate-500 mt-1">
              Create a template to pre-fill standard terms in new quotations.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="p-6 flex justify-between items-start hover:bg-slate-50/50">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-semibold text-slate-900">{tmpl.name}</h3>
                    {tmpl.isActive ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                        Inactive
                      </span>
                    )}
                  </div>
                  {tmpl.description && (
                    <p className="text-xs text-slate-600 whitespace-pre-line mt-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {tmpl.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    Created on {new Date(tmpl.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(tmpl)}
                    className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                    title="Edit Template"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                {editingTemplate ? "Edit Template" : "New Quotation Template"}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-lg text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard SaaS Enterprise Terms"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Standard Terms, Conditions & Notes
                </label>
                <textarea
                  rows={6}
                  placeholder="Pre-filled terms & conditions for proposals created with this template..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
                >
                  {submitting ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

