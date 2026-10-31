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
  Percent,
  ShieldAlert,
  Settings,
  Sparkles,
} from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isAdmin = user?.role === Role.ADMIN;
  const isStaff = user?.role === Role.STAFF;

  const basePath = isAdmin ? "/admin" : "/staff";

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, adminOnly: true },
    { name: "Customers", href: `${basePath}/customers`, icon: Users },
    { name: "Products", href: `${basePath}/products`, icon: Package },
    { name: "Plans", href: `${basePath}/plans`, icon: Layers },
    { name: "Quotations", href: "/admin/quotations", icon: FileText, dev2: true },
    { name: "Subscriptions", href: "/admin/subscriptions", icon: Repeat, dev2: true },
    { name: "Invoices", href: "/admin/invoices", icon: Receipt, dev2: true },
    { name: "Payments", href: "/admin/payments", icon: CreditCard, dev3: true },
    { name: "Discounts", href: "/admin/discounts", icon: Percent, dev3: true },
    { name: "Staff Management", href: "/admin/staff", icon: ShieldAlert, adminOnly: true },
    { name: "Settings", href: "/admin/settings", icon: Settings, adminOnly: true },
  ];

  const visibleNav = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 space-x-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-white text-base tracking-tight">Brightloop</span>
          <span className="text-xs text-brand-400 block font-medium -mt-1">SMS Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Core Modules
        </div>
        {visibleNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </div>
              {item.dev2 && (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                  Dev 2
                </span>
              )}
              {item.dev3 && (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                  Dev 3
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Current User Pill */}
      {user && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-brand-400">
              {user.fullName[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.fullName}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[11px] text-slate-400 capitalize">{user.role.toLowerCase()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
