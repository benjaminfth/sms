import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface UnsavedChangesIndicatorProps {
  hasChanges: boolean;
  onReset: () => void;
  disabled?: boolean;
}

export function UnsavedChangesIndicator({
  hasChanges,
  onReset,
  disabled = false,
}: UnsavedChangesIndicatorProps) {
  if (!hasChanges) return null;

  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-[12px] animate-in fade-in duration-200">
      <AlertCircle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
      <span className="font-medium">You have unsaved changes</span>
      <button
        type="button"
        onClick={onReset}
        disabled={disabled}
        className="ml-1 inline-flex items-center space-x-1 text-[11px] font-semibold text-[#B45309] underline hover:text-[#78350F] transition-colors"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Reset</span>
      </button>
    </div>
  );
}
