import React from "react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SettingsSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  description?: string;
  error?: string;
  options: SelectOption[];
}

export function SettingsSelect({
  label,
  description,
  error,
  options,
  id,
  className = "",
  disabled,
  ...props
}: SettingsSelectProps) {
  const selectId = id || `settings-select-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={selectId} className="block text-[13px] font-medium text-[#172033]">
          {label}
        </label>
        {props.required && <span className="text-[11px] text-[#DC2626]">Required</span>}
      </div>
      {description && <p className="text-[12px] text-[#64748B] leading-normal">{description}</p>}
      <select
        id={selectId}
        disabled={disabled}
        className={`w-full h-9 rounded-md border text-[13px] px-3 bg-white transition-colors focus:outline-none focus:ring-1 focus:ring-[#315CF5] ${
          error
            ? "border-[#DC2626] text-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]"
            : "border-[#E5EAF1] text-[#172033] hover:border-[#CBD5E1] focus:border-[#315CF5]"
        } ${disabled ? "bg-[#F8FAFC] text-[#94A3B8] cursor-not-allowed border-[#E5EAF1]" : ""} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] font-medium text-[#DC2626] mt-1">{error}</p>}
    </div>
  );
}
