import React from "react";
import {
  Sliders,
  Building2,
  CreditCard,
  Receipt,
  Repeat,
  Bell,
  ShieldCheck,
  Globe,
  Server,
} from "lucide-react";
import { SettingsCategory } from "@sms/shared";

export interface SettingsTabItem {
  id: SettingsCategory;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SETTINGS_TABS: SettingsTabItem[] = [
  {
    id: SettingsCategory.GENERAL,
    name: "General",
    description: "Application preferences and defaults",
    icon: Sliders,
  },
  {
    id: SettingsCategory.COMPANY,
    name: "Company Profile",
    description: "Legal info, address and document branding",
    icon: Building2,
  },
  {
    id: SettingsCategory.BILLING,
    name: "Billing & Payments",
    description: "Payment methods, terms and bank details",
    icon: CreditCard,
  },
  {
    id: SettingsCategory.INVOICES,
    name: "Invoices",
    description: "Numbering sequence, defaults and layout",
    icon: Receipt,
  },
  {
    id: SettingsCategory.SUBSCRIPTIONS,
    name: "Subscriptions",
    description: "Lifecycle policies, pause and renewal rules",
    icon: Repeat,
  },
  {
    id: SettingsCategory.NOTIFICATIONS,
    name: "Notifications",
    description: "Transactional emails and alert rules",
    icon: Bell,
  },
  {
    id: SettingsCategory.SECURITY,
    name: "Security",
    description: "Password policies and session governance",
    icon: ShieldCheck,
  },
  {
    id: SettingsCategory.REGIONAL,
    name: "Regional Preferences",
    description: "Timezone, currency and number formats",
    icon: Globe,
  },
  {
    id: SettingsCategory.SYSTEM,
    name: "System Information",
    description: "Application health and infrastructure metrics",
    icon: Server,
  },
];

interface SettingsSidebarProps {
  activeTab: SettingsCategory;
  onSelectTab: (tab: SettingsCategory) => void;
  hasChangesInTab?: (tab: SettingsCategory) => boolean;
}

export function SettingsSidebar({
  activeTab,
  onSelectTab,
  hasChangesInTab,
}: SettingsSidebarProps) {
  return (
    <nav className="w-full lg:w-64 shrink-0 space-y-1">
      <div className="hidden lg:block px-3 py-2 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
        SETTINGS CATEGORIES
      </div>

      {/* Horizontal scroll for mobile/tablet */}
      <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 gap-1 no-scrollbar">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const hasUnsaved = hasChangesInTab ? hasChangesInTab(tab.id) : false;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left text-[13px] font-medium transition-all shrink-0 lg:w-full ${
                isActive
                  ? "bg-[#315CF5]/10 text-[#315CF5] font-semibold"
                  : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#172033]"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-[#315CF5]" : "text-[#94A3B8]"
                  }`}
                />
                <span className="whitespace-nowrap">{tab.name}</span>
              </div>
              {hasUnsaved && (
                <span className="ml-2 w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" title="Unsaved changes" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
