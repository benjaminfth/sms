import React from "react";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="border-b border-[#E5EAF1] pb-4">
        <h2 className="text-[20px] font-semibold text-[#172033] tracking-tight">{title}</h2>
        <p className="text-[13px] text-[#64748B] mt-1 leading-relaxed max-w-3xl">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
