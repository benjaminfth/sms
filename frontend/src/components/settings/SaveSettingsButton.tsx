import React from "react";
import { Check, Loader2 } from "lucide-react";

interface SaveSettingsButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  hasChanges?: boolean;
  text?: string;
}

export function SaveSettingsButton({
  onClick,
  loading = false,
  disabled = false,
  hasChanges = false,
  text = "Save Changes",
}: SaveSettingsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md text-[13px] font-medium transition-all shadow-xs ${
        hasChanges
          ? "bg-[#315CF5] text-white hover:bg-[#2549D8] focus:ring-2 focus:ring-[#315CF5]/30"
          : "bg-[#315CF5]/90 text-white hover:bg-[#315CF5]"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-white" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <Check className="w-4 h-4" />
          <span>{text}</span>
        </>
      )}
    </button>
  );
}
