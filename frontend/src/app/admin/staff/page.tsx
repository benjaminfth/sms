"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { UserDTO, Role, PaginationMeta } from "@sms/shared";
import { formatDate } from "@/lib/utils";
import { Plus, Shield, Search, UserCheck, X } from "lucide-react";
import { PasswordRequirementsChecklist } from "@/components/shared/PasswordRequirementsChecklist";

export default function AdminStaffPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
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
      const res = await api.post("/users", createForm);
      if (res.success) {
        setIsCreateOpen(false);
        setCreateForm({ fullName: "", email: "", password: "", role: Role.STAFF });
        fetchUsers();
      }
    } catch (err: any) {
      setCreateError(err.message || "Failed to create staff account.");
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
      const res = await api.patch(`/users/${editRoleUser.id}/role`, {
        role: selectedRole,
      });
      if (res.success) {
        setEditRoleUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      setRoleError(err.message || "Failed to change user role.");
    } finally {
      setRoleLoading(false);
    }
  };

  const columns: Column<UserDTO>[] = [
    {
      header: "Staff Member",
      cell: (item) => (
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-[6px] bg-[#172033] text-white flex items-center justify-center font-semibold text-xs shrink-0">
            {item.fullName[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <span className="font-medium text-[#172033] block truncate">{item.fullName}</span>
            <span className="text-[11px] text-[#64748B] block truncate">{item.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Role Permission",
      cell: (item) => {
        let badgeColor = "bg-[#F1F5F9] text-[#64748B] border-[#E5EAF1]";
        if (item.role === Role.ADMIN) {
          badgeColor = "bg-[#EFF4FE] text-[#315CF5] border-[#C8DEF6]";
        } else if (item.role === Role.STAFF) {
          badgeColor = "bg-[#EDF7F2] text-[#16865B] border-[#C7E8D8]";
        }
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-[11px] font-mono font-medium border ${badgeColor}`}
          >
            {item.role}
          </span>
        );
      },
    },
    {
      header: "Account Status",
      cell: (item) => <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      header: "Creation Date",
      cell: (item) => (
        <span className="text-[12px] font-mono text-[#64748B]">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      cell: (item) =>
        isAdmin ? (
          <button
            onClick={() => {
              setEditRoleUser(item);
              setSelectedRole(item.role);
              setRoleError(null);
            }}
            className="text-[12px] font-medium text-[#315CF5] hover:text-[#2549D8] px-2.5 py-1 rounded-[6px] hover:bg-[#EFF4FE] transition-colors"
          >
            Modify Role
          </button>
        ) : (
          <span className="text-[11px] text-[#94A3B8]">Restricted</span>
        ),
    },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Staff & User Management"
        description="Operator accounts, internal roles, and administrative authorization levels."
        badge={
          pagination ? (
            <span className="px-2 py-0.5 rounded-[5px] bg-[#F1F5F9] border border-[#E5EAF1] text-[11px] font-medium text-[#64748B]">
              {pagination.total} Users
            </span>
          ) : undefined
        }
      >
        {isAdmin && (
          <button
            onClick={() => {
              setIsCreateOpen(true);
              setCreateError(null);
            }}
            className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-medium rounded-[8px] bg-[#315CF5] text-white hover:bg-[#2549D8] shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Staff Member
          </button>
        )}
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
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-[#F8FAFC] border border-[#E5EAF1] rounded-[8px] focus:bg-white focus:outline-hidden focus:border-[#315CF5] text-[#172033] transition"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        loading={loading}
        emptyTitle="No staff members found"
        emptyDescription="Create operator accounts to allow team members to access operational modules."
      />

      {/* Create Staff Modal */}
      {isCreateOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !createLoading) setIsCreateOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs"
        >
          <div className="bg-white rounded-[12px] max-w-md w-full p-6 shadow-dropdown border border-[#E5EAF1] animate-fade-in">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E5EAF1]">
              <h3 className="text-[16px] font-semibold text-[#172033]">Create Operations Account</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[#94A3B8] hover:text-[#172033] p-1 rounded-[6px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="mt-3.5 p-2.5 bg-[#FDEDED] text-[#D14343] border border-[#F8C6C6] rounded-[8px] text-[12px] font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="mt-4 space-y-3.5 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">
                  Full Name <span className="text-[#D14343]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="e.g. Alex Miller"
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">
                  Work Email <span className="text-[#D14343]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="alex@brightloop.demo"
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">
                  Temporary Password <span className="text-[#D14343]">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Min 9 chars (e.g. Brightloop!2026)"
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
                />
                <PasswordRequirementsChecklist
                  password={createForm.password}
                  hasSubmitted={Boolean(createError)}
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">Role Level</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })}
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
                >
                  <option value={Role.STAFF}>STAFF (Operational Management)</option>
                  <option value={Role.ADMIN}>ADMIN (Full Platform Authority)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#E5EAF1]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] rounded-[8px] shadow-xs"
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
            if (e.target === e.currentTarget && !roleLoading) setEditRoleUser(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs"
        >
          <div className="bg-white rounded-[12px] max-w-sm w-full p-6 shadow-dropdown border border-[#E5EAF1] animate-fade-in">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E5EAF1]">
              <h3 className="text-[16px] font-semibold text-[#172033]">Modify User Role</h3>
              <button
                onClick={() => setEditRoleUser(null)}
                className="text-[#94A3B8] hover:text-[#172033] p-1 rounded-[6px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {roleError && (
              <div className="mt-3.5 p-2.5 bg-[#FDEDED] text-[#D14343] border border-[#F8C6C6] rounded-[8px] text-[12px] font-medium">
                {roleError}
              </div>
            )}

            <form onSubmit={handleUpdateRole} className="mt-4 space-y-4 text-[13px]">
              <div className="bg-[#F8FAFC] p-3 rounded-[8px] border border-[#E5EAF1]">
                <p className="text-[11px] font-medium text-[#64748B] mb-0.5">Account Target:</p>
                <p className="font-semibold text-[#172033]">{editRoleUser.fullName}</p>
                <p className="text-[11px] text-[#64748B]">{editRoleUser.email}</p>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">
                  Assign Permission Level
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Role)}
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
                >
                  <option value={Role.ADMIN}>ADMIN (Full Access)</option>
                  <option value={Role.STAFF}>STAFF (Operational Modules)</option>
                  <option value={Role.CUSTOMER}>CUSTOMER (Self-Service Portal)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E5EAF1]">
                <button
                  type="button"
                  onClick={() => setEditRoleUser(null)}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleLoading}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] rounded-[8px] shadow-xs"
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
