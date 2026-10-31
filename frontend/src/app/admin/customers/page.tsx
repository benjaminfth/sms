"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/api-client";
import { CustomerDTO, PaginationMeta } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import {
  Search,
  Plus,
  Building,
  Phone,
  Mail,
  MapPin,
  X,
  CreditCard,
  Receipt,
  Repeat,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

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
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-[6px] bg-[#EFF4FE] text-[#315CF5] border border-[#C8DEF6] flex items-center justify-center font-semibold text-xs shrink-0">
            {item.fullName[0]?.toUpperCase() || "C"}
          </div>
          <div className="min-w-0">
            <button
              onClick={() => setSelectedCustomer(item)}
              className="font-medium text-[#172033] hover:text-[#315CF5] text-left truncate block max-w-[200px]"
            >
              {item.fullName}
            </button>
            <p className="text-[11px] text-[#64748B] truncate max-w-[200px]">{item.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Company",
      cell: (item) => (
        <span className="text-[12px] text-[#172033]">
          {item.companyName || <span className="text-[#94A3B8]">—</span>}
        </span>
      ),
    },
    {
      header: "Phone",
      cell: (item) => (
        <span className="text-[12px] font-mono text-[#64748B]">
          {item.phone || <span className="text-[#94A3B8]">—</span>}
        </span>
      ),
    },
    {
      header: "Location",
      cell: (item) => (
        <span className="text-[12px] text-[#64748B]">
          {[item.city, item.state].filter(Boolean).join(", ") || (
            <span className="text-[#94A3B8]">—</span>
          )}
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
        <span className="text-[12px] font-mono text-[#64748B]">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      cell: (item) => (
        <button
          onClick={() => setSelectedCustomer(item)}
          className="text-[12px] font-medium text-[#315CF5] hover:text-[#2549D8] px-2.5 py-1 rounded-[6px] hover:bg-[#EFF4FE] transition-colors"
        >
          View Profile
        </button>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Customers"
        description="Directory of client accounts, contact details and subscription profiles."
        badge={
          pagination ? (
            <span className="px-2 py-0.5 rounded-[5px] bg-[#F1F5F9] border border-[#E5EAF1] text-[11px] font-medium text-[#64748B]">
              {pagination.total} Total
            </span>
          ) : undefined
        }
      >
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] bg-[#315CF5] text-white hover:bg-[#2549D8] shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Customer
        </button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-[10px] border border-[#E5EAF1] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, company..."
            className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-[#F8FAFC] border border-[#E5EAF1] rounded-[8px] focus:bg-white focus:outline-hidden focus:border-[#315CF5] text-[#172033] transition"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
        emptyTitle="No customers found"
        emptyDescription="Create your first customer to begin managing enterprise subscriptions."
      />

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCustomer(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs"
        >
          <div className="bg-white rounded-[12px] max-w-lg w-full p-6 shadow-dropdown border border-[#E5EAF1] animate-fade-in">
            <div className="flex items-start justify-between pb-4 border-b border-[#E5EAF1]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#EFF4FE] text-[#315CF5] border border-[#C8DEF6] flex items-center justify-center font-bold text-sm">
                  {selectedCustomer.fullName[0]?.toUpperCase() || "C"}
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#172033] leading-tight">
                    {selectedCustomer.fullName}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <StatusBadge status={selectedCustomer.isActive ? "ACTIVE" : "INACTIVE"} />
                    <span className="text-[11px] text-[#94A3B8] font-mono">
                      ID: {selectedCustomer.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 text-[#94A3B8] hover:text-[#172033] rounded-[6px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-[13px]">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] block mb-2">
                  Organization & Contact
                </span>
                <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-3 rounded-[8px] border border-[#E5EAF1]">
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Company</span>
                    <span className="font-medium text-[#172033]">
                      {selectedCustomer.companyName || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Tax ID / GSTIN</span>
                    <span className="font-mono text-[12px] font-medium text-[#172033]">
                      {selectedCustomer.gstOrTaxId || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Email</span>
                    <span className="text-[#172033]">{selectedCustomer.email}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Phone</span>
                    <span className="font-mono text-[12px] text-[#172033]">
                      {selectedCustomer.phone || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] block mb-2">
                  Billing Address
                </span>
                <div className="bg-[#F8FAFC] p-3 rounded-[8px] border border-[#E5EAF1] text-[12px] text-[#172033]">
                  <p>
                    {[selectedCustomer.city, selectedCustomer.state, selectedCustomer.country]
                      .filter(Boolean)
                      .join(", ") || "No address on file."}
                  </p>
                </div>
              </div>

              {/* Quick links to customer's records */}
              <div className="pt-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] block mb-2">
                  Related Operational Records
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <Link
                    href={`/admin/subscriptions?search=${encodeURIComponent(selectedCustomer.fullName)}`}
                    className="p-2.5 rounded-[8px] border border-[#E5EAF1] bg-white hover:bg-[#F8FAFC] text-center transition group"
                  >
                    <Repeat className="w-4 h-4 text-[#315CF5] mx-auto mb-1" />
                    <span className="text-[11px] font-medium text-[#172033] block">Subscriptions</span>
                  </Link>
                  <Link
                    href={`/admin/invoices?search=${encodeURIComponent(selectedCustomer.fullName)}`}
                    className="p-2.5 rounded-[8px] border border-[#E5EAF1] bg-white hover:bg-[#F8FAFC] text-center transition group"
                  >
                    <Receipt className="w-4 h-4 text-[#16865B] mx-auto mb-1" />
                    <span className="text-[11px] font-medium text-[#172033] block">Invoices</span>
                  </Link>
                  <Link
                    href={`/admin/payments?search=${encodeURIComponent(selectedCustomer.fullName)}`}
                    className="p-2.5 rounded-[8px] border border-[#E5EAF1] bg-white hover:bg-[#F8FAFC] text-center transition group"
                  >
                    <CreditCard className="w-4 h-4 text-[#3978C8] mx-auto mb-1" />
                    <span className="text-[11px] font-medium text-[#172033] block">Payments</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E5EAF1] flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-3.5 py-1.5 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px] transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !formLoading) setIsAddOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs"
        >
          <div className="bg-white rounded-[12px] max-w-md w-full p-6 shadow-dropdown border border-[#E5EAF1] animate-fade-in">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E5EAF1]">
              <div>
                <h3 className="text-[16px] font-semibold text-[#172033]">Create Customer</h3>
                <p className="text-[12px] text-[#64748B] mt-0.5">Add an enterprise client account</p>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-[#94A3B8] hover:text-[#172033] p-1 rounded-[6px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-2.5 bg-[#FDEDED] text-[#D14343] border border-[#F8C6C6] rounded-[8px] text-[12px] font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-3.5 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">
                  Full Name <span className="text-[#D14343]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">
                  Email Address <span className="text-[#D14343]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rahul@company.com"
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">Company Name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Acme Technologies Pvt Ltd"
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#172033] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#172033] mb-1">GST / Tax ID</label>
                  <input
                    type="text"
                    value={formData.gstOrTaxId}
                    onChange={(e) => setFormData({ ...formData, gstOrTaxId: e.target.value })}
                    placeholder="29AAAAA0000A1Z5"
                    className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#172033] mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Bengaluru"
                    className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#172033] mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Karnataka"
                    className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] focus:outline-hidden focus:border-[#315CF5] text-[#172033]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#E5EAF1]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  disabled={formLoading}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] rounded-[8px] shadow-xs"
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
