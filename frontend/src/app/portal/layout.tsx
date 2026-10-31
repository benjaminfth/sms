"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Role } from "@sms/shared";
import {
  LayoutDashboard,
  Repeat,
  FileText,
  Receipt,
  CreditCard,
  User,
  LogOut,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const navItems = [
    { name: "Portal Overview", href: "/portal", icon: LayoutDashboard },
    { name: "My Subscriptions", href: "/portal/subscriptions", icon: Repeat },
    { name: "My Quotations", href: "/portal/quotations", icon: FileText },
    { name: "My Invoices", href: "/portal/invoices", icon: Receipt },
    { name: "My Payments", href: "/portal/payments", icon: CreditCard },
    { name: "Company Profile", href: "/portal/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Customer Portal Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white text-base tracking-tight">Brightloop</span>
            <span className="text-[11px] text-brand-400 block font-semibold -mt-0.5">
              Customer Portal
            </span>
          </div>
        </div>

        {/* Customer Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Self-Service Account
          </div>
          {navItems.map((item) => {
            const isActive =
              item.href === "/portal"
                ? pathname === "/portal"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-brand-400 shrink-0">
                {user?.fullName?.[0]?.toUpperCase() || "C"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.fullName}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
