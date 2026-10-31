"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { KeyRound, ArrowRight, CheckCircle2 } from "lucide-react";
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
        }, 2500);
      }
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired or is invalid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200/80">
      {success ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Password Reset Successful!</h3>
          <p className="text-sm text-slate-500 mt-1">
            Your password has been securely updated. Redirecting to sign in...
          </p>
          <div className="mt-5">
            <Link
              href="/login"
              className="inline-flex items-center text-sm font-semibold text-brand-600 hover:text-brand-500"
            >
              Sign in now <ArrowRight className="ml-1.5 w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {!token && (
            <div className="mb-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
              Warning: No reset token detected in URL query parameters. If you followed an email link, ensure the full link was copied.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-hidden transition"
              />
              <PasswordRequirementsChecklist
                password={newPassword}
                hasSubmitted={hasSubmitted}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-hidden transition"
              />
              {confirmPassword && (
                <p
                  className={`mt-1.5 text-xs font-medium flex items-center ${
                    newPassword === confirmPassword ? "text-emerald-600" : "text-rose-600"
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
              className="w-full mt-2 flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Update Password</span>
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Remembered your credentials?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-500">
              Back to Sign in
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Reset Your Password
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Create a secure, complex password for your Brightloop account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense
          fallback={
            <div className="bg-white py-12 px-4 shadow-xl sm:rounded-2xl border border-slate-200/80 text-center text-sm text-slate-500">
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
