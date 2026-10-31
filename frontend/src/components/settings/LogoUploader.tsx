"use client";

import React, { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

interface LogoUploaderProps {
  currentLogo: string | null;
  onUpload: (dataUrl: string) => Promise<void>;
  onRemove: () => Promise<void>;
  disabled?: boolean;
}

export function LogoUploader({ currentLogo, onUpload, onRemove, disabled = false }: LogoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setError("Please select a valid image file (PNG, JPG, WebP, or SVG).");
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image file size must be less than 2MB.");
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        await onUpload(dataUrl);
        setLoading(false);
      };
      reader.onerror = () => {
        setError("Failed to read file.");
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err?.message || "Failed to upload image.");
      setLoading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (disabled || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onRemove();
    } catch (err: any) {
      setError(err?.message || "Failed to remove logo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-[13px] font-medium text-[#172033]">Company Logo</label>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            Appears on invoices, quotations, and emails. Recommended: PNG or SVG, min 200×200px.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Preview box */}
        <div className="relative w-20 h-20 rounded-lg border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] flex items-center justify-center overflow-hidden shrink-0">
          {loading ? (
            <Loader2 className="w-6 h-6 text-[#315CF5] animate-spin" />
          ) : currentLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentLogo}
              alt="Company Logo Preview"
              className="w-full h-full object-contain p-1.5"
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-[#94A3B8]" />
          )}
        </div>

        {/* Action controls */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFileChange}
            disabled={disabled || loading}
            className="hidden"
          />

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={disabled || loading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-[#E5EAF1] bg-white text-[12px] font-medium text-[#172033] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] disabled:opacity-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#64748B]" />
              <span>{currentLogo ? "Replace Logo" : "Upload Logo"}</span>
            </button>

            {currentLogo && (
              <button
                type="button"
                disabled={disabled || loading}
                onClick={handleRemove}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-md border border-transparent text-[12px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#94A3B8]">PNG, JPG, WebP, or SVG up to 2MB</p>
        </div>
      </div>

      {error && <p className="text-[11px] font-medium text-[#DC2626]">{error}</p>}
    </div>
  );
}
