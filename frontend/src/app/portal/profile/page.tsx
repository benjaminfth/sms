"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import {
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Save,
  CheckCircle2,
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
          const d = res.data;
          setProfile(d);
          setFullName(d.fullName || "");
          setCompanyName(d.companyName || "");
          setPhone(d.phone || "");
          setBillingAddressLine1(d.billingAddressLine1 || "");
          setBillingAddressLine2(d.billingAddressLine2 || "");
          setCity(d.city || "");
          setState(d.state || "");
          setPostalCode(d.postalCode || "");
          setGstOrTaxId(d.gstOrTaxId || "");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load company profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const res = await api.patch("/portal/profile", {
        fullName,
        companyName,
        phone,
        billingAddressLine1,
        billingAddressLine2,
        city,
        state,
        postalCode,
        gstOrTaxId,
      });

      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-[#94A3B8]">
        <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#315CF5] border-t-transparent" />
        <p className="mt-2 text-[12px] text-[#64748B]">Loading company profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="pb-5 border-b border-[#E5EAF1]">
        <h1 className="text-[26px] font-semibold tracking-tight text-[#172033] leading-tight">
          Company Profile
        </h1>
        <p className="mt-1 text-[13px] text-[#64748B]">
          Update contact information, corporate tax identifiers and official billing coordinates.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-[#EDF7F2] text-[#16865B] border border-[#C7E8D8] rounded-[8px] text-[12px] font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Profile changes saved successfully.</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-[#FDEDED] text-[#D14343] border border-[#F8C6C6] rounded-[8px] text-[12px] font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs space-y-4">
          <h2 className="text-[14px] font-semibold text-[#172033] pb-3 border-b border-[#E5EAF1]">
            Contact & Entity Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Primary Contact Name <span className="text-[#D14343]">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Corporate Entity / Company
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={gstOrTaxId}
                onChange={(e) => setGstOrTaxId(e.target.value)}
                placeholder="29AAAAA0000A1Z5"
                className="w-full px-3 py-1.5 text-[13px] font-mono uppercase bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[10px] border border-[#E5EAF1] shadow-xs space-y-4">
          <h2 className="text-[14px] font-semibold text-[#172033] pb-3 border-b border-[#E5EAF1]">
            Billing Coordinates
          </h2>

          <div className="space-y-3.5 text-[13px]">
            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                value={billingAddressLine1}
                onChange={(e) => setBillingAddressLine1(e.target.value)}
                placeholder="Street address or suite"
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#172033] mb-1">
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                value={billingAddressLine2}
                onChange={(e) => setBillingAddressLine2(e.target.value)}
                placeholder="Building, Landmark, etc."
                className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#172033] mb-1">PIN / Postal</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3 py-1.5 text-[13px] font-mono bg-white border border-[#E5EAF1] rounded-[8px] text-[#172033] focus:outline-hidden focus:border-[#315CF5]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] rounded-[8px] shadow-xs transition flex items-center space-x-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Profile"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
