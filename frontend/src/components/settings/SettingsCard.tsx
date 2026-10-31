import React from "react";

interface SettingsCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function SettingsCard({ title, description, children, footer, className = "" }: SettingsCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-[#E5EAF1] shadow-xs overflow-hidden ${className}`}>
      {(title || description) && (
        <div className="px-5 py-4 border-b border-[#E5EAF1] bg-white">
          {title && <h3 className="text-[15px] font-semibold text-[#172033] tracking-tight">{title}</h3>}
          {description && <p className="text-[13px] text-[#64748B] mt-0.5 leading-normal">{description}</p>}
        </div>
      )}
      <div className="p-5 space-y-5">{children}</div>
      {footer && (
        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E5EAF1] flex items-center justify-between text-xs text-[#64748B]">
          {footer}
        </div>
      )}
    </div>
  );
}
