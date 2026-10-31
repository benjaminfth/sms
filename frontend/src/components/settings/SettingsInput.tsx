import React from "react";

interface SettingsInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
  prefixText?: string;
  suffixText?: string;
}

export function SettingsInput({
  label,
  description,
  error,
  prefixText,
  suffixText,
  id,
  className = "",
  disabled,
  ...props
}: SettingsInputProps) {
  const inputId = id || `settings-input-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="block text-[13px] font-medium text-[#172033]">
          {label}
        </label>
        {props.required && <span className="text-[11px] text-[#DC2626]">Required</span>}
      </div>
      {description && <p className="text-[12px] text-[#64748B] leading-normal">{description}</p>}
      <div className="relative flex items-center">
        {prefixText && (
          <span className="absolute left-3 text-[13px] text-[#64748B] font-mono pointer-events-none select-none">
            {prefixText}
          </span>
        )}
        <input
          id={inputId}
          disabled={disabled}
          className={`w-full h-9 rounded-md border text-[13px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#315CF5] ${
            prefixText ? "pl-9" : "px-3"
          } ${suffixText ? "pr-12" : "px-3"} ${
            error
              ? "border-[#DC2626] text-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]"
              : "border-[#E5EAF1] bg-white text-[#172033] hover:border-[#CBD5E1] focus:border-[#315CF5]"
          } ${disabled ? "bg-[#F8FAFC] text-[#94A3B8] cursor-not-allowed border-[#E5EAF1]" : ""} ${className}`}
          {...props}
        />
        {suffixText && (
          <span className="absolute right-3 text-[12px] text-[#64748B] pointer-events-none select-none">
            {suffixText}
          </span>
        )}
      </div>
      {error && <p className="text-[11px] font-medium text-[#DC2626] mt-1">{error}</p>}
    </div>
  );
}
