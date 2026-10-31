"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  Menu,
  Search,
  ChevronRight,
  Shield,
  CircleDot,
} from "lucide-react";

interface AppHeaderProps {
  onToggleSidebar?: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Derive breadcrumbs from path
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbItems = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const label = seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { href, label, isLast: idx === segments.length - 1 };
  });

  return (
    <header className="sticky top-0 z-20 h-14 bg-white border-b border-[#E5EAF1] px-5 sm:px-8 flex items-center justify-between">
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 -ml-1 text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] rounded-[6px]"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-[13px] min-w-0">
          <Link
            href={user?.role === "ADMIN" ? "/admin/dashboard" : "/staff/customers"}
            className="text-[#94A3B8] hover:text-[#172033] transition-colors truncate hidden sm:inline"
          >
            Brightloop
          </Link>
          {breadcrumbItems.length > 0 && (
            <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1] shrink-0 hidden sm:inline" />
          )}
          {breadcrumbItems.map((item, i) => (
            <React.Fragment key={item.href}>
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1] shrink-0" />}
              {item.isLast ? (
                <span className="font-medium text-[#172033] truncate">{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="text-[#64748B] hover:text-[#172033] transition-colors truncate hidden md:inline"
                >
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Runtime info & User quick actions */}
      <div className="flex items-center space-x-3 shrink-0">
        {/* Runtime badge */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-[6px] bg-[#F8FAFC] border border-[#E5EAF1] text-[11px] font-medium text-[#64748B]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16865B]" />
          <span>Live Production</span>
          <span className="text-[#CBD5E1] mx-0.5">•</span>
          <span className="text-[#172033] font-mono font-medium">INR (₹)</span>
        </div>

        {/* User Pill & Sign out */}
        {user && (
          <div className="flex items-center space-x-2 pl-2 border-l border-[#E5EAF1]">
            <div className="flex items-center space-x-2 text-[12px] text-[#172033]">
              <div className="w-7 h-7 rounded-[6px] bg-[#EFF4FE] text-[#315CF5] font-semibold flex items-center justify-center text-xs border border-[#C8DEF6]">
                {user.fullName[0]?.toUpperCase() || "U"}
              </div>
              <span className="hidden md:inline font-medium text-[#172033] max-w-[120px] truncate">
                {user.fullName}
              </span>
            </div>

            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 text-[#64748B] hover:text-[#D14343] hover:bg-[#F8FAFC] rounded-[6px] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
