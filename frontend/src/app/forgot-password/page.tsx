"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { ArrowRight, CheckCircle2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ message: string; resetUrl?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post<{ message: string; resetUrl?: string }>("/auth/forgot-password", {
        email,
      });

      if (res.success && res.data) {
        setSuccessData(res.data);
      } else {
        setSuccessData({
          message: "If an account with that email exists, a password reset link has been generated.",
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to process password reset request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-primary-accent/10">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-10 h-10 rounded-btn bg-primary-accent flex items-center justify-center text-white shadow-xs">
          <div className="w-4 h-4 border-2 border-white rounded-[3px] rotate-45 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>
        <h1 className="mt-4 text-[26px] font-semibold text-text-primary tracking-tight">
          Forgot Password
        </h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Enter your registered email address to receive recovery instructions
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-[420px]">
        <div className="bg-surface-card py-7 px-6 sm:px-8 rounded-dialog border border-border shadow-xs">
          {successData ? (
            <div className="text-center py-4">
              <div className="w-11 h-11 rounded-full bg-status-success/15 text-status-success mx-auto flex items-center justify-center mb-3.5">
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-[17px] font-semibold text-text-primary">Instructions Dispatched</h3>
              <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">
                {successData.message}
              </p>

              {successData.resetUrl && (
                <div className="mt-4 p-3 rounded-btn bg-surface-canvas border border-border text-left">
                  <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">
                    Development Bypass Link
                  </div>
                  <Link
                    href={successData.resetUrl}
                    className="text-[12px] font-mono text-primary-accent hover:underline break-all"
                  >
                    {successData.resetUrl}
                  </Link>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-border">
                <Link
                  href="/login"
                  className="inline-flex items-center text-[13px] font-medium text-primary-accent hover:text-primary-hover hover:underline"
                >
                  <ArrowLeft className="mr-1.5 w-3.5 h-3.5" /> Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 p-3 rounded-btn bg-status-danger/10 border border-status-danger/20 text-[12px] text-status-danger font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                    Account Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-input text-[13px] text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex justify-center items-center py-2.5 px-4 rounded-btn text-[13px] font-medium text-white bg-primary-accent hover:bg-primary-hover focus:outline-hidden focus:ring-2 focus:ring-primary-accent/20 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="flex items-center">
                      <span>Send Reset Link</span>
                      <ArrowRight className="ml-2 w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-border text-center text-[12px]">
                <Link
                  href="/login"
                  className="inline-flex items-center font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  <ArrowLeft className="mr-1.5 w-3.5 h-3.5" /> Back to Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
