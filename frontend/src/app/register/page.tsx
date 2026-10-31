"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { PasswordRequirementsChecklist } from "@/components/shared/PasswordRequirementsChecklist";
import { checkPasswordRequirements } from "@sms/shared";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setHasSubmitted(true);

    const reqs = checkPasswordRequirements(formData.password);
    if (!reqs.isValid) {
      setError("Please ensure your password satisfies all 4 complexity requirements.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please verify your confirmation password.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/register", {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        companyName: formData.companyName || undefined,
        phone: formData.phone || undefined,
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to register account. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-primary-accent/10">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brightloop Brand Mark */}
        <div className="mx-auto w-10 h-10 rounded-btn bg-primary-accent flex items-center justify-center text-white shadow-xs">
          <div className="w-4 h-4 border-2 border-white rounded-[3px] rotate-45 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>
        <h1 className="mt-4 text-[26px] font-semibold text-text-primary tracking-tight">
          Create an Enterprise Account
        </h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Register to access Brightloop subscription services
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-[460px]">
        <div className="bg-surface-card py-7 px-6 sm:px-8 rounded-dialog border border-border shadow-xs">
          {success ? (
            <div className="text-center py-6">
              <div className="w-11 h-11 rounded-full bg-status-success/15 text-status-success mx-auto flex items-center justify-center mb-3.5">
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-[17px] font-semibold text-text-primary">Registration Successful</h3>
              <p className="text-[13px] text-text-secondary mt-1">
                Your customer account has been established. Redirecting to sign in...
              </p>
              <div className="mt-5">
                <Link
                  href="/login"
                  className="inline-flex items-center text-[13px] font-medium text-primary-accent hover:text-primary-hover hover:underline"
                >
                  Proceed immediately to login <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-2 bg-surface-card border border-border rounded-input text-[13px] text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="Acme Corp"
                      className="w-full px-3 py-2 bg-surface-card border border-border rounded-input text-[13px] text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="customer@example.com"
                      className="w-full px-3 py-2 bg-surface-card border border-border rounded-input text-[13px] text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 bg-surface-card border border-border rounded-input text-[13px] text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 9 chars (e.g. Pass!2026)"
                      className="w-full pl-3 pr-10 py-2 bg-surface-card border border-border rounded-input text-[13px] text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-colors font-mono tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary focus:outline-none p-1 rounded transition-colors"
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
                  <PasswordRequirementsChecklist
                    password={formData.password}
                    hasSubmitted={hasSubmitted}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Re-enter your password"
                      className="w-full pl-3 pr-10 py-2 bg-surface-card border border-border rounded-input text-[13px] text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-colors font-mono tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary focus:outline-none p-1 rounded transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword && (
                    <p
                      className={`mt-1.5 text-[11px] font-medium flex items-center ${
                        formData.password === formData.confirmPassword
                          ? "text-status-success"
                          : "text-status-danger"
                      }`}
                    >
                      {formData.password === formData.confirmPassword
                        ? "✓ Passwords match"
                        : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 flex justify-center items-center py-2.5 px-4 rounded-btn text-[13px] font-medium text-white bg-primary-accent hover:bg-primary-hover focus:outline-hidden focus:ring-2 focus:ring-primary-accent/20 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="flex items-center">
                      <span>Create Account</span>
                      <ArrowRight className="ml-2 w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-border text-center text-[12px] text-text-secondary">
                Already registered?{" "}
                <Link href="/login" className="font-medium text-primary-accent hover:text-primary-hover hover:underline transition-colors">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
