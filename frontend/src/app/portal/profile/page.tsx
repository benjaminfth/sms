"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import {
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
} from "lucide-react";

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [billingAddressLine1, setBillingAddressLine1] = useState("");
  const [billingAddressLine2, setBillingAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [gstOrTaxId, setGstOrTaxId] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const res = await api.get<any>("/portal/profile");
        if (res.success && res.data) {
          const p = res.data;
          setProfile(p);
          setFullName(p.fullName || "");
          setCompanyName(p.companyName || "");
          setPhone(p.phone || "");
          setBillingAddressLine1(p.billingAddressLine1 || "");
          setBillingAddressLine2(p.billingAddressLine2 || "");
          setCity(p.city || "");
          setState(p.state || "");
          setPostalCode(p.postalCode || "");
          setGstOrTaxId(p.gstOrTaxId || "");
        } else {
          setError(res.error?.message || "Failed to load profile");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await api.patch<any>("/portal/profile", {
        fullName,
        companyName: companyName || null,
        phone: phone || null,
        billingAddressLine1: billingAddressLine1 || null,
        billingAddressLine2: billingAddressLine2 || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        gstOrTaxId: gstOrTaxId || null,
      });

      if (res.success && res.data) {
        setProfile(res.data);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert(res.error?.message || "Failed to update profile");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Billing Profile & Organization Details
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Update your company details, legal billing address, and GSTIN identification used for tax
          invoices.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Billing profile updated successfully. Future invoices will reflect these details.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
        {/* Account Info (Read-only Email) */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            Contact & Identity
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Company / Organization</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Innovations Pvt Ltd"
                className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Registered Email</label>
              <input
                type="email"
                disabled
                value={profile?.email || ""}
                className="w-full text-sm border border-gray-200 bg-gray-50 text-gray-500 rounded-lg p-2.5 cursor-not-allowed"
              />
              <span className="text-[11px] text-gray-400">Primary login credential (managed by administrator)</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Taxation & Compliance
          </h3>
          <div className="max-w-sm">
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Customer GSTIN / Tax Identification
            </label>
            <input
              type="text"
              value={gstOrTaxId}
              onChange={(e) => setGstOrTaxId(e.target.value.toUpperCase())}
              placeholder="e.g. 29AABCU9603R1ZM"
              className="w-full font-mono text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary uppercase"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Used to generate input tax credit eligible B2B GST tax invoices.
            </span>
          </div>
        </div>

        {/* Billing Address */}
        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Billing & Registered Address
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Address Line 1</label>
              <input
                type="text"
                value={billingAddressLine1}
                onChange={(e) => setBillingAddressLine1(e.target.value)}
                placeholder="Building name, Floor, Street"
                className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Address Line 2 (Optional)</label>
              <input
                type="text"
                value={billingAddressLine2}
                onChange={(e) => setBillingAddressLine2(e.target.value)}
                placeholder="Area, Landmark"
                className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Postal Code (PIN)</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 560001"
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving Changes..." : "Save Profile Details"}
          </button>
        </div>
      </form>
    </div>
  );
}
