"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Repeat,
  FileText,
  Receipt,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

export default function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#315CF5] border-t-transparent" />
      </div>
    );
  }

  const navItems = [
    { name: "Overview", href: "/portal", icon: LayoutDashboard },
    { name: "My Subscriptions", href: "/portal/subscriptions", icon: Repeat },
    { name: "My Quotations", href: "/portal/quotations", icon: FileText },
    { name: "My Invoices", href: "/portal/invoices", icon: Receipt },
    { name: "Payment History", href: "/portal/payments", icon: CreditCard },
    { name: "Account Profile", href: "/portal/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row text-[#172033]">
      {/* Mobile Top Header */}
      <div className="lg:hidden h-14 bg-white border-b border-[#E5EAF1] px-5 flex items-center justify-between">
        <Link href="/portal" className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-[7px] bg-[#315CF5] flex items-center justify-center text-white shadow-xs">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          </div>
          <span className="font-semibold text-[14px] text-[#172033]">Customer Portal</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-[#64748B] hover:text-[#172033] rounded-[6px]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Customer Portal Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[245px] bg-white border-r border-[#E5EAF1] flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:h-screen lg:shrink-0`}
      >
        {/* Portal Branding */}
        <div className="h-14 flex items-center px-5 border-b border-[#E5EAF1] shrink-0">
          <Link href="/portal" className="flex items-center space-x-2.5">
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
                <span className="text-[10px] font-semibold text-[#16865B] bg-[#EDF7F2] px-1 py-0.5 rounded-[4px]">
                  PORTAL
                </span>
              </div>
              <span className="text-[11px] text-[#94A3B8] block mt-0.5">Subscriber Self-Service</span>
            </div>
          </Link>
        </div>

        {/* Portal Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
            My Account
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
                onClick={() => setMobileMenuOpen(false)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-[7px] text-[13px] font-medium transition-colors ${
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
        </nav>

        {/* User profile & Logout footer */}
        <div className="p-3 border-t border-[#E5EAF1] bg-white shrink-0">
          <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#F8FAFC] border border-[#E5EAF1]">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-7 h-7 rounded-[6px] bg-[#315CF5] text-white flex items-center justify-center font-semibold text-xs shrink-0">
                {user?.fullName?.[0]?.toUpperCase() || "C"}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[#172033] truncate leading-tight">
                  {user?.fullName}
                </p>
                <p className="text-[10px] text-[#64748B] truncate leading-tight mt-0.5">
                  {user?.email}
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
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 px-6 sm:px-8 py-6 sm:py-7 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
