"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, ShieldCheck, UserCheck, Users, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#315CF5]/10">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brightloop Brand Mark */}
        <div className="mx-auto w-10 h-10 rounded-[8px] bg-[#315CF5] flex items-center justify-center text-white shadow-xs">
          <div className="w-4 h-4 border-2 border-white rounded-[3px] rotate-45 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>
        <h1 className="mt-4 text-[26px] font-semibold text-[#172033] tracking-tight">
          Sign in to Brightloop SMS
        </h1>
        <p className="mt-1 text-[13px] text-[#64748B]">
          Subscription Management & Recurring Billing Platform
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-[420px]">
        <div className="bg-white py-7 px-6 sm:px-8 rounded-[12px] border border-[#E5EAF1] shadow-xs">
          {error && (
            <div className="mb-5 p-3 rounded-[8px] bg-[#FDEDED] border border-[#F8C6C6] text-[12px] text-[#D14343] font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@brightloop.demo"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5EAF1] rounded-[8px] text-[13px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#315CF5] focus:ring-1 focus:ring-[#315CF5] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-[#E5EAF1] rounded-[8px] text-[13px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#315CF5] focus:ring-1 focus:ring-[#315CF5] transition-colors font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#172033] focus:outline-none p-1 rounded-[4px] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <Link
                  href="/forgot-password"
                  className="text-[12px] font-medium text-[#315CF5] hover:text-[#2549D8] hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex justify-center items-center py-2.5 px-4 rounded-[8px] text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] focus:outline-none focus:ring-2 focus:ring-[#315CF5]/20 disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="flex items-center">
                  <span>Sign In to Console</span>
                  <ArrowRight className="ml-2 w-3.5 h-3.5" />
                </div>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-[#E5EAF1]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8]">
                Quick Demo Access
              </span>
              <span className="text-[11px] text-[#94A3B8]">One-click populate</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("admin@brightloop.demo", "Brightloop!2026")}
                className="px-2.5 py-2 text-[12px] font-medium rounded-[8px] border border-[#E5EAF1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172033] flex items-center justify-center space-x-1.5 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#315CF5]" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("staff@brightloop.demo", "Brightloop!2026")}
                className="px-2.5 py-2 text-[12px] font-medium rounded-[8px] border border-[#E5EAF1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172033] flex items-center justify-center space-x-1.5 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#3978C8]" />
                <span>Staff</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("customer@brightloop.demo", "Brightloop!2026")}
                className="px-2.5 py-2 text-[12px] font-medium rounded-[8px] border border-[#E5EAF1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172033] flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-[#16865B]" />
                <span>Customer</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E5EAF1] text-center text-[12px] text-[#64748B]">
            Need an enterprise account?{" "}
            <Link href="/register" className="font-medium text-[#315CF5] hover:text-[#2549D8] hover:underline transition-colors">
              Register here
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#94A3B8]">
          Brightloop SMS v2.4 • Bank-grade 256-bit SSL encryption
        </p>
      </div>
    </div>
  );
}
