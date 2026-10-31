"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/api-client";
import { UserDTO, Role, PaginationMeta } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Plus, Shield, Search, UserCheck, X } from "lucide-react";
import { PasswordRequirementsChecklist } from "@/components/shared/PasswordRequirementsChecklist";

export default function AdminStaffPage() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Create Staff Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: Role.STAFF,
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Role Edit Modal
  const [editRoleUser, setEditRoleUser] = useState<UserDTO | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.STAFF);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<UserDTO[]>("/users", {
        page,
        pageSize: 10,
        search: search || undefined,
      });
      if (res.success && res.data) {
        setUsers(res.data);
        setPagination(res.meta);
      }
    } catch (err) {
      console.error("Failed to load staff users:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await api.post("/users/staff", createForm);
      if (res.success) {
        setIsCreateOpen(false);
        setCreateForm({
          fullName: "",
          email: "",
          password: "",
          role: Role.STAFF,
        });
        fetchUsers();
      }
    } catch (err: any) {
      setCreateError(err.message || "Failed to create staff member");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoleUser) return;
    setRoleLoading(true);
    setRoleError(null);

    try {
      const res = await api.put(`/users/${editRoleUser.id}/role`, {
        role: selectedRole,
      });
      if (res.success) {
        setEditRoleUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      setRoleError(err.message || "Failed to update role");
    } finally {
      setRoleLoading(false);
    }
  };

  const columns: Column<UserDTO>[] = [
    {
      header: "User Details",
      cell: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.fullName}</span>
          <p className="text-xs text-slate-400">{item.email}</p>
        </div>
      ),
    },
    {
      header: "System Role",
      cell: (item) => {
        let roleStyle = "bg-slate-100 text-slate-700";
        if (item.role === Role.ADMIN) roleStyle = "bg-purple-100 text-purple-800 border-purple-200";
        if (item.role === Role.STAFF) roleStyle = "bg-blue-100 text-blue-800 border-blue-200";
        if (item.role === Role.CUSTOMER) roleStyle = "bg-emerald-100 text-emerald-800 border-emerald-200";

        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${roleStyle}`}>
            {item.role}
          </span>
        );
      },
    },
    {
      header: "Status",
      cell: (item) => <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      header: "Member Since",
      cell: (item) => <span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span>,
    },
    {
      header: "Admin Actions",
      cell: (item) => (
        <button
          onClick={() => {
            setEditRoleUser(item);
            setSelectedRole(item.role);
          }}
          className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-brand-600 hover:text-brand-800"
        >
          Assign Role
        </button>
      ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Staff & User Management"
        description="Admin-only directory for provisioning internal operations accounts and managing role hierarchies"
      >
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Create Staff Account
        </button>
      </PageHeader>

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
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500 text-slate-900"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      {/* Create Staff Modal */}
      {isCreateOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create Operations Account</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-3 p-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Staff Name</label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="e.g. Alex Miller"
                  className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Work Email</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="staff@brightloop.demo"
                  className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Min 9 chars (e.g. Brightloop!2026)"
                  className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
                />
                <PasswordRequirementsChecklist
                  password={createForm.password}
                  hasSubmitted={Boolean(createError)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Role Level</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })}
                  className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value={Role.STAFF}>STAFF (Catalog & Customer Operations)</option>
                  <option value={Role.ADMIN}>ADMIN (Full Platform Authority)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
                >
                  {createLoading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {editRoleUser && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditRoleUser(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Change User Role</h3>
              <button onClick={() => setEditRoleUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {roleError && (
              <div className="mt-3 p-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
                {roleError}
              </div>
            )}

            <form onSubmit={handleUpdateRole} className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Target Account:</p>
                <p className="text-sm font-semibold text-slate-900">{editRoleUser.fullName}</p>
                <p className="text-xs text-slate-400">{editRoleUser.email}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Assigned Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Role)}
                  className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value={Role.ADMIN}>ADMIN</option>
                  <option value={Role.STAFF}>STAFF</option>
                  <option value={Role.CUSTOMER}>CUSTOMER</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditRoleUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
                >
                  {roleLoading ? "Updating..." : "Update Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
