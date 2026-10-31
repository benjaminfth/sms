"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  FileText,
  Repeat,
  Zap,
  Receipt,
  FileCode,
  ShieldCheck,
  Building2,
  LogOut,
} from "lucide-react";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, quickSwitch, logout } = useAuth();

  const navigation = [
    { name: "Quotations", href: "/quotations", icon: FileText, roles: ["ADMIN", "STAFF", "CUSTOMER"] },
    { name: "Templates", href: "/quotation-templates", icon: FileCode, roles: ["ADMIN", "STAFF"] },
    { name: "Subscriptions", href: "/subscriptions", icon: Repeat, roles: ["ADMIN", "STAFF", "CUSTOMER"] },
    { name: "Billing Engine", href: "/billing", icon: Zap, roles: ["ADMIN", "STAFF"] },
    { name: "Invoices", href: "/invoices", icon: Receipt, roles: ["ADMIN", "STAFF", "CUSTOMER"] },
  ];

  const filteredNav = navigation.filter(
    (item) => !user || item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/quotations" className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  BL
                </div>
                <div>
                  <span className="text-lg font-bold text-slate-900 tracking-tight">
                    Brightloop
                  </span>
                  <span className="text-xs text-indigo-600 font-medium ml-1.5 uppercase tracking-wider">
                    SMS
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex space-x-1">
                {filteredNav.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Quick Role Switcher for Hackathon Demonstrations */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs">
                <span className="px-2 py-1 text-slate-500 font-semibold flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Role:
                </span>
                {(["ADMIN", "STAFF", "CUSTOMER"] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => quickSwitch(role)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      user?.role === role
                        ? "bg-white text-indigo-600 shadow-sm font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              {user && (
                <div className="hidden lg:flex items-center text-xs text-slate-500 border-l border-slate-200 pl-3">
                  <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  <span className="font-medium text-slate-700 mr-1">{user.fullName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

