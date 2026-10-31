"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/api-client";
import { CustomerDTO, PaginationMeta } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Search, Plus, Building, Phone, Mail, MapPin, X } from "lucide-react";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Selected customer for detail drawer
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDTO | null>(null);

  // New Customer Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    companyName: "",
    phone: "",
    city: "",
    state: "",
    gstOrTaxId: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<CustomerDTO[]>("/customers", {
        page,
        pageSize: 10,
        search: search || undefined,
      });
      if (res.success && res.data) {
        setCustomers(res.data);
        setPagination(res.meta);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await api.post("/customers", formData);
      if (res.success) {
        setIsAddOpen(false);
        setFormData({
          fullName: "",
          email: "",
          companyName: "",
          phone: "",
          city: "",
          state: "",
          gstOrTaxId: "",
        });
        fetchCustomers();
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create customer");
    } finally {
      setFormLoading(false);
    }
  };

  const columns: Column<CustomerDTO>[] = [
    {
      header: "Customer",
      cell: (item) => (
        <div>
          <button
            onClick={() => setSelectedCustomer(item)}
            className="font-semibold text-brand-600 hover:text-brand-800 text-left"
          >
            {item.fullName}
          </button>
          <p className="text-xs text-slate-400">{item.email}</p>
        </div>
      ),
    },
    {
      header: "Company",
      cell: (item) => (
        <span className="text-xs font-medium text-slate-700">
          {item.companyName || "—"}
        </span>
      ),
    },
    {
      header: "Phone",
      cell: (item) => <span className="text-xs">{item.phone || "—"}</span>,
    },
    {
      header: "Status",
      cell: (item) => <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      header: "Created",
      cell: (item) => <span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span>,
    },
    {
      header: "Actions",
      cell: (item) => (
        <button
          onClick={() => setSelectedCustomer(item)}
          className="text-xs font-semibold text-brand-600 hover:text-brand-800 px-2.5 py-1 rounded bg-slate-50 border border-slate-200"
        >
          View Profile
        </button>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Customer Management"
        description="Search, view profiles, and manage enterprise subscription accounts"
      >
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Customer
        </button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, company..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500 text-slate-900"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedCustomer.fullName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">ID: {selectedCustomer.id}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-sm">
              <div className="flex items-center text-slate-600 space-x-3">
                <Building className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-900">
                  {selectedCustomer.companyName || "No Company Specified"}
                </span>
              </div>
              <div className="flex items-center text-slate-600 space-x-3">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{selectedCustomer.email}</span>
              </div>
              <div className="flex items-center text-slate-600 space-x-3">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{selectedCustomer.phone || "No phone on record"}</span>
              </div>
              <div className="flex items-center text-slate-600 space-x-3">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {[selectedCustomer.city, selectedCustomer.state, selectedCustomer.country]
                    .filter(Boolean)
                    .join(", ") || "No address on record"}
                </span>
              </div>
              {selectedCustomer.gstOrTaxId && (
                <div className="p-2.5 bg-slate-50 rounded-lg text-xs font-mono text-slate-700">
                  GST/Tax ID: <strong>{selectedCustomer.gstOrTaxId}</strong>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create Enterprise Customer</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Contact Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Primary contact person"
                  className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="billing@company.com"
                  className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Company Name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Acme Global Solutions"
                  className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91..."
                    className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">GST ID</label>
                  <input
                    type="text"
                    value={formData.gstOrTaxId}
                    onChange={(e) => setFormData({ ...formData, gstOrTaxId: e.target.value })}
                    placeholder="29AAAAA0000A1Z5"
                    className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
                >
                  {formLoading ? "Creating..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
