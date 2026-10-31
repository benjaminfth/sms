"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { LogOut, Bell, Shield } from "lucide-react";

export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-xs">
      {/* Platform Status */}
      <div className="flex items-center space-x-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
          SMS Production Runtime
        </span>
        <span className="hidden md:inline-block text-xs text-slate-400">
          Currency: <strong className="text-slate-600 font-semibold">INR (₹)</strong>
        </span>
      </div>

      {/* User Actions */}
      <div className="flex items-center space-x-4">
        {user && (
          <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Shield className="w-3.5 h-3.5 text-brand-600" />
            <span>Role: <strong className="text-slate-800">{user.role}</strong></span>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 border border-slate-200 hover:border-red-200 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
