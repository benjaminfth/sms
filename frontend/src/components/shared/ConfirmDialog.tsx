import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs"
    >
      <div className="bg-white rounded-[12px] max-w-md w-full p-6 shadow-dropdown border border-[#E5EAF1]">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 ${
                isDanger ? "bg-[#FDEDED] text-[#D14343]" : "bg-[#EFF4FE] text-[#315CF5]"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#172033] leading-tight">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-[#94A3B8] hover:text-[#172033] p-1 rounded-[6px]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 text-[13px] text-[#64748B] leading-relaxed">{description}</p>

        <div className="mt-6 flex justify-end space-x-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3.5 py-1.5 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px] transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-3.5 py-1.5 text-[13px] font-medium text-white rounded-[8px] transition ${
              isDanger
                ? "bg-[#D14343] hover:bg-[#B83232]"
                : "bg-[#315CF5] hover:bg-[#2549D8]"
            }`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
