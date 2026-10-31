"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Role } from "@sms/shared";
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  FileText,
  Repeat,
  Receipt,
  CreditCard,
  Scale,
  Percent,
  Landmark,
  ShieldAlert,
  Zap,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === Role.ADMIN;
  const basePath = isAdmin ? "/admin" : "/staff";

  const navigationSections: NavSection[] = [
    {
      title: "WORKSPACE",
      items: [
        { name: "Overview", href: "/admin/dashboard", icon: LayoutDashboard, adminOnly: true },
        { name: "Customers", href: `${basePath}/customers`, icon: Users },
        { name: "Products", href: `${basePath}/products`, icon: Package },
        { name: "Plans", href: `${basePath}/plans`, icon: Layers },
        { name: "Quotations", href: "/admin/quotations", icon: FileText },
        { name: "Subscriptions", href: "/admin/subscriptions", icon: Repeat },
      ],
    },
    {
      title: "BILLING",
      items: [
        { name: "Invoices", href: "/admin/invoices", icon: Receipt },
        { name: "Payments", href: "/admin/payments", icon: CreditCard },
        { name: "Reconciliation", href: "/admin/reconciliation", icon: Scale, adminOnly: true },
        { name: "Discounts", href: "/admin/discounts", icon: Percent },
        { name: "Taxes", href: "/admin/taxes", icon: Landmark, adminOnly: true },
      ],
    },
    {
      title: "MANAGEMENT",
      items: [
        { name: "Staff & Users", href: "/admin/staff", icon: ShieldAlert, adminOnly: true },
        { name: "Billing Engine", href: "/admin/billing", icon: Zap, adminOnly: true },
        { name: "Settings", href: "/admin/settings", icon: Settings, adminOnly: true },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[245px] bg-white border-r border-[#E5EAF1] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center px-5 border-b border-[#E5EAF1] shrink-0">
          <Link href={isAdmin ? "/admin/dashboard" : `${basePath}/customers`} className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-[7px] bg-[#315CF5] flex items-center justify-center text-white shadow-xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
            </div>
            <div className="leading-none">
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-[14px] text-[#172033] tracking-tight">Brightloop</span>
                <span className="text-[10px] font-semibold text-[#315CF5] bg-[#EFF4FE] px-1 py-0.5 rounded-[4px]">SMS</span>
              </div>
              <span className="text-[11px] text-[#94A3B8] block mt-0.5">Subscription Management</span>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navigationSections.map((section) => {
            const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  {section.title}
                </div>
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => onClose?.()}
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-[7px] text-[13px] font-medium transition-colors ${
                        isActive
                          ? "bg-[#EFF4FE] text-[#315CF5]"
                          : "text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? "text-[#315CF5]" : "text-[#94A3B8] group-hover:text-[#64748B]"
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#315CF5] shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Profile & Sign Out Footer */}
        {user && (
          <div className="p-3 border-t border-[#E5EAF1] bg-[#FFFFFF] shrink-0">
            <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#F8FAFC] border border-[#E5EAF1]">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-[6px] bg-[#172033] text-white flex items-center justify-center font-semibold text-xs shrink-0">
                  {user.fullName[0]?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#172033] truncate leading-tight">
                    {user.fullName}
                  </p>
                  <p className="text-[10px] text-[#64748B] capitalize mt-0.5 leading-tight">
                    {user.role.toLowerCase()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => logout()}
                title="Sign Out"
                className="p-1.5 text-[#94A3B8] hover:text-[#D14343] hover:bg-white rounded-[6px] transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
