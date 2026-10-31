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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${
                isDanger ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600">{description}</p>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
