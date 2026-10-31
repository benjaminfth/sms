import React from "react";

interface SettingsTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  description?: string;
  error?: string;
}

export function SettingsTextarea({
  label,
  description,
  error,
  id,
  className = "",
  disabled,
  rows = 3,
  ...props
}: SettingsTextareaProps) {
  const textareaId = id || `settings-textarea-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={textareaId} className="block text-[13px] font-medium text-[#172033]">
          {label}
        </label>
        {props.required && <span className="text-[11px] text-[#DC2626]">Required</span>}
      </div>
      {description && <p className="text-[12px] text-[#64748B] leading-normal">{description}</p>}
      <textarea
        id={textareaId}
        disabled={disabled}
        rows={rows}
        className={`w-full rounded-md border text-[13px] p-3 transition-colors focus:outline-none focus:ring-1 focus:ring-[#315CF5] ${
          error
            ? "border-[#DC2626] text-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]"
            : "border-[#E5EAF1] bg-white text-[#172033] hover:border-[#CBD5E1] focus:border-[#315CF5]"
        } ${disabled ? "bg-[#F8FAFC] text-[#94A3B8] cursor-not-allowed border-[#E5EAF1]" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-[11px] font-medium text-[#DC2626] mt-1">{error}</p>}
    </div>
  );
}
