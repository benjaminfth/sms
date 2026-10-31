import React from "react";

interface SettingsToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  id,
}: SettingsToggleProps) {
  const toggleId = id || `settings-toggle-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  return (
    <div className="flex items-start justify-between py-2.5 gap-4">
      <div className="space-y-0.5 select-none">
        <label
          htmlFor={toggleId}
          className={`text-[13px] font-medium block cursor-pointer ${
            disabled ? "text-[#94A3B8] cursor-not-allowed" : "text-[#172033]"
          }`}
        >
          {label}
        </label>
        {description && (
          <p className="text-[12px] text-[#64748B] leading-normal">{description}</p>
        )}
      </div>
      <button
        type="button"
        id={toggleId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#315CF5] focus:ring-offset-1 ${
          checked ? "bg-[#315CF5]" : "bg-[#CBD5E1]"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
