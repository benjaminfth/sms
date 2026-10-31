"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { ArrowRight, CheckCircle2, ArrowLeft } from "lucide-react";
import { PasswordRequirementsChecklist } from "@/components/shared/PasswordRequirementsChecklist";
import { checkPasswordRequirements } from "@sms/shared";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setHasSubmitted(true);

    if (!token) {
      setError("Reset token is missing from the URL. Please request a new password reset link.");
      return;
    }

    const reqs = checkPasswordRequirements(newPassword);
    if (!reqs.isValid) {
      setError("Please ensure your new password satisfies all 4 complexity requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify your confirmation password.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/reset-password", {
        token,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired or is invalid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-card py-7 px-6 sm:px-8 rounded-dialog border border-border shadow-xs">
      {success ? (
        <div className="text-center py-5">
          <div className="w-11 h-11 rounded-full bg-status-success/15 text-status-success mx-auto flex items-center justify-center mb-3.5">
            <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h3 className="text-[17px] font-semibold text-text-primary">Password Reset Successful</h3>
          <p className="text-[13px] text-text-secondary mt-1">
            Your password has been securely updated. Redirecting to sign in...
          </p>
          <div className="mt-5">
            <Link
              href="/login"
              className="inline-flex items-center text-[13px] font-medium text-primary-accent hover:text-primary-hover hover:underline"
            >
              Sign in now <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
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

          {!token && (
            <div className="mb-5 p-3 rounded-btn bg-status-warning/10 border border-status-warning/20 text-[12px] text-status-warning font-medium">
              Notice: No reset token detected in URL query parameters. If you followed an email link, ensure the complete address was copied.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-input text-[13px] text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-colors font-mono tracking-wider"
              />
              <PasswordRequirementsChecklist
                password={newPassword}
                hasSubmitted={hasSubmitted}
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-input text-[13px] text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-colors font-mono tracking-wider"
              />
              {confirmPassword && (
                <p
                  className={`mt-1.5 text-[11px] font-medium flex items-center ${
                    newPassword === confirmPassword ? "text-status-success" : "text-status-danger"
                  }`}
                >
                  {newPassword === confirmPassword
                    ? "✓ Passwords match"
                    : "✗ Passwords do not match"}
                </p>
              )}
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
                  <span>Update Password</span>
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
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-primary-accent/10">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-10 h-10 rounded-btn bg-primary-accent flex items-center justify-center text-white shadow-xs">
          <div className="w-4 h-4 border-2 border-white rounded-[3px] rotate-45 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>
        <h1 className="mt-4 text-[26px] font-semibold text-text-primary tracking-tight">
          Reset Your Password
        </h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Create a secure, compliant password for your Brightloop account
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-[420px]">
        <Suspense
          fallback={
            <div className="bg-surface-card py-12 px-4 rounded-dialog border border-border text-center text-[13px] text-text-secondary">
              Loading password reset form...
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
