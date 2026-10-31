"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api-client";
import {
  SettingsCategory,
  AllSettingsDTO,
  GeneralSettingsDTO,
  CompanyProfileDTO,
  BillingPaymentsSettingsDTO,
  InvoiceSettingsDTO,
  SubscriptionSettingsDTO,
  NotificationSettingsDTO,
  SecuritySettingsDTO,
  RegionalPreferencesDTO,
  SystemInformationDTO,
} from "@sms/shared";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { SettingsInput } from "@/components/settings/SettingsInput";
import { SettingsSelect } from "@/components/settings/SettingsSelect";
import { SettingsToggle } from "@/components/settings/SettingsToggle";
import { SettingsTextarea } from "@/components/settings/SettingsTextarea";
import { LogoUploader } from "@/components/settings/LogoUploader";
import { SaveSettingsButton } from "@/components/settings/SaveSettingsButton";
import { UnsavedChangesIndicator } from "@/components/settings/UnsavedChangesIndicator";
import {
  AlertCircle,
  CheckCircle2,
  Mail,
  Send,
  Loader2,
  Users,
  UserCheck,
  Package,
  Repeat,
  Receipt,
  Server,
  Database,
  Calendar,
  Clock,
  ShieldAlert,
  Info,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsCategory>(SettingsCategory.GENERAL);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Server state
  const [serverSettings, setServerSettings] = useState<AllSettingsDTO | null>(null);

  // Editable local state per category
  const [general, setGeneral] = useState<GeneralSettingsDTO | null>(null);
  const [company, setCompany] = useState<CompanyProfileDTO | null>(null);
  const [billing, setBilling] = useState<BillingPaymentsSettingsDTO | null>(null);
  const [invoices, setInvoices] = useState<InvoiceSettingsDTO | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSettingsDTO | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettingsDTO | null>(null);
  const [security, setSecurity] = useState<SecuritySettingsDTO | null>(null);
  const [regional, setRegional] = useState<RegionalPreferencesDTO | null>(null);
  const [system, setSystem] = useState<SystemInformationDTO | null>(null);

  // Test email state
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>("");
  const [sendingTestEmail, setSendingTestEmail] = useState<boolean>(false);
  const [testEmailResult, setTestEmailResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Reset confirmation modal state
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Fetch all settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<AllSettingsDTO>("/settings");
      if (res.success && res.data) {
        setServerSettings(res.data);
        setGeneral(res.data.general);
        setCompany(res.data.company);
        setBilling(res.data.billing);
        setInvoices(res.data.invoices);
        setSubscriptions(res.data.subscriptions);
        setNotifications(res.data.notifications);
        setSecurity(res.data.security);
        setRegional(res.data.regional);
        setSystem(res.data.system);
        if (res.data.notifications?.adminNotificationEmail) {
          setTestEmailRecipient(res.data.notifications.adminNotificationEmail);
        }
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to load platform settings.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Check if a category has unsaved changes
  const hasChangesInTab = useCallback(
    (tab: SettingsCategory): boolean => {
      if (!serverSettings) return false;
      try {
        switch (tab) {
          case SettingsCategory.GENERAL:
            return JSON.stringify(general) !== JSON.stringify(serverSettings.general);
          case SettingsCategory.COMPANY:
            return JSON.stringify(company) !== JSON.stringify(serverSettings.company);
          case SettingsCategory.BILLING:
            return JSON.stringify(billing) !== JSON.stringify(serverSettings.billing);
          case SettingsCategory.INVOICES:
            return JSON.stringify(invoices) !== JSON.stringify(serverSettings.invoices);
          case SettingsCategory.SUBSCRIPTIONS:
            return (
              JSON.stringify(subscriptions) !==
              JSON.stringify(serverSettings.subscriptions)
            );
          case SettingsCategory.NOTIFICATIONS:
            return (
              JSON.stringify(notifications) !==
              JSON.stringify(serverSettings.notifications)
            );
          case SettingsCategory.SECURITY:
            return JSON.stringify(security) !== JSON.stringify(serverSettings.security);
          case SettingsCategory.REGIONAL:
            return JSON.stringify(regional) !== JSON.stringify(serverSettings.regional);
          case SettingsCategory.SYSTEM:
            return false;
          default:
            return false;
        }
      } catch {
        return false;
      }
    },
    [
      serverSettings,
      general,
      company,
      billing,
      invoices,
      subscriptions,
      notifications,
      security,
      regional,
    ]
  );

  const currentTabHasChanges = hasChangesInTab(activeTab);

  // Reset active tab changes
  const handleResetActiveTab = () => {
    if (!serverSettings) return;
    switch (activeTab) {
      case SettingsCategory.GENERAL:
        setGeneral({ ...serverSettings.general });
        break;
      case SettingsCategory.COMPANY:
        setCompany({ ...serverSettings.company });
        break;
      case SettingsCategory.BILLING:
        setBilling({ ...serverSettings.billing });
        break;
      case SettingsCategory.INVOICES:
        setInvoices({ ...serverSettings.invoices });
        break;
      case SettingsCategory.SUBSCRIPTIONS:
        setSubscriptions({ ...serverSettings.subscriptions });
        break;
      case SettingsCategory.NOTIFICATIONS:
        setNotifications({ ...serverSettings.notifications });
        break;
      case SettingsCategory.SECURITY:
        setSecurity({ ...serverSettings.security });
        break;
      case SettingsCategory.REGIONAL:
        setRegional({ ...serverSettings.regional });
        break;
      default:
        break;
    }
    setShowResetConfirm(false);
  };

  // Save current category
  const handleSaveActiveCategory = async () => {
    if (activeTab === SettingsCategory.SYSTEM) return;
    setSaving(true);
    setNotification(null);

    let payload: any = null;
    switch (activeTab) {
      case SettingsCategory.GENERAL:
        payload = general;
        break;
      case SettingsCategory.COMPANY:
        payload = company;
        break;
      case SettingsCategory.BILLING:
        payload = billing;
        break;
      case SettingsCategory.INVOICES:
        payload = invoices;
        break;
      case SettingsCategory.SUBSCRIPTIONS:
        payload = subscriptions;
        break;
      case SettingsCategory.NOTIFICATIONS:
        payload = notifications;
        break;
      case SettingsCategory.SECURITY:
        payload = security;
        break;
      case SettingsCategory.REGIONAL:
        payload = regional;
        break;
    }

    try {
      const res = await api.put<any>(`/settings/${activeTab}`, payload);
      if (res.success && res.data) {
        setServerSettings((prev) => (prev ? { ...prev, [activeTab]: res.data } : null));
        setNotification({
          type: "success",
          message: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings saved successfully.`,
        });
      } else {
        throw new Error(res.error?.message || "Failed to update settings.");
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "An error occurred while saving settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Logo Upload
  const handleLogoUpload = async (logoDataUrl: string) => {
    try {
      const res = await api.post<{ logoUrl: string }>("/settings/company/logo", {
        logo: logoDataUrl,
      });
      if (res.success && res.data?.logoUrl) {
        setCompany((prev) => (prev ? { ...prev, companyLogo: res.data!.logoUrl } : null));
        setServerSettings((prev) =>
          prev
            ? {
                ...prev,
                company: { ...prev.company, companyLogo: res.data!.logoUrl },
              }
            : null
        );
        setNotification({
          type: "success",
          message: "Company logo uploaded and updated successfully.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to upload company logo.",
      });
      throw err;
    }
  };

  // Handle Logo Delete
  const handleLogoDelete = async () => {
    try {
      const res = await api.delete<{ message: string }>("/settings/company/logo");
      if (res.success) {
        setCompany((prev) => (prev ? { ...prev, companyLogo: null } : null));
        setServerSettings((prev) =>
          prev
            ? {
                ...prev,
                company: { ...prev.company, companyLogo: null },
              }
            : null
        );
        setNotification({
          type: "success",
          message: "Company logo removed successfully.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to remove company logo.",
      });
      throw err;
    }
  };

  // Handle Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailRecipient.trim()) {
      setTestEmailResult({
        success: false,
        message: "Please enter a valid recipient email address.",
      });
      return;
    }
    setSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await api.post<{ message: string; recipient: string }>(
        "/settings/notifications/test-email",
        {
          recipientEmail: testEmailRecipient.trim(),
        }
      );
      if (res.success) {
        setTestEmailResult({
          success: true,
          message: `Test email sent successfully to ${testEmailRecipient.trim()}.`,
        });
      } else {
        setTestEmailResult({
          success: false,
          message: res.error?.message || "Failed to deliver test email.",
        });
      }
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: err?.message || "Failed to send test email.",
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Settings"
        description="Manage your organization and configure how your subscription platform operates."
        badge={
          <span className="px-2.5 py-0.5 rounded-[5px] bg-[#EEF2FF] border border-[#C7D2FE] text-[11px] font-semibold text-[#315CF5]">
            ADMIN CONSOLE
          </span>
        }
      >
        <div className="flex items-center space-x-3">
          <UnsavedChangesIndicator
            hasChanges={currentTabHasChanges}
            onReset={() => setShowResetConfirm(true)}
            disabled={saving}
          />
          {activeTab !== SettingsCategory.SYSTEM && (
            <SaveSettingsButton
              onClick={handleSaveActiveCategory}
              loading={saving}
              disabled={loading}
              hasChanges={currentTabHasChanges}
            />
          )}
        </div>
      </PageHeader>

      {/* Notifications Alert Banner */}
      {notification && (
        <div
          className={`mb-4 flex items-center justify-between p-3.5 rounded-lg border text-[13px] ${
            notification.type === "success"
              ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
              : "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-[12px] font-medium hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Settings Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side Navigation */}
        <SettingsSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (currentTabHasChanges) {
              const confirmSwitch = window.confirm(
                "You have unsaved changes in this tab. Switch tabs anyway?"
              );
              if (!confirmSwitch) return;
            }
            setActiveTab(tab);
            setNotification(null);
          }}
          hasChangesInTab={hasChangesInTab}
        />

        {/* Right Main Content Panel */}
        <main className="flex-1 min-w-0 space-y-6">
          {loading ? (
            <div className="bg-white rounded-xl border border-[#E5EAF1] p-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#315CF5] animate-spin" />
              <p className="text-[13px] text-[#64748B]">
                Loading organization and platform settings...
              </p>
            </div>
          ) : (
            <>
              {/* ==================================================== */}
              {/* 1. GENERAL SETTINGS */}
              {/* ==================================================== */}
              {activeTab === SettingsCategory.GENERAL && general && (
                <div className="space-y-6">
                  <SettingsCard
                    title="Organization Identity"
                    description="General brand identity and customer support contact channels."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SettingsInput
                        label="Organization / Application Name"
                        value={general.organizationName}
                        onChange={(e) =>
                          setGeneral({ ...general, organizationName: e.target.value })
                        }
                        placeholder="Brightloop"
                        required
                      />
                      <SettingsInput
                        label="Organization Display Name"
                        value={general.displayName}
                        onChange={(e) =>
                          setGeneral({ ...general, displayName: e.target.value })
                        }
                        placeholder="Brightloop Technologies"
                      />
                      <SettingsInput
                        label="Support Email"
                        type="email"
                        value={general.supportEmail}
                        onChange={(e) =>
                          setGeneral({ ...general, supportEmail: e.target.value })
                        }
                        placeholder="support@brightloop.io"
                        required
                      />
                      <SettingsInput
                        label="Support Phone Number"
                        value={general.supportPhone}
                        onChange={(e) =>
                          setGeneral({ ...general, supportPhone: e.target.value })
                        }
                        placeholder="+91 98765 43210"
                      />
                      <div className="md:col-span-2">
                        <SettingsInput
                          label="Website URL"
                          type="url"
                          value={general.websiteUrl}
                          onChange={(e) =>
                            setGeneral({ ...general, websiteUrl: e.target.value })
                          }
                          placeholder="https://brightloop.io"
                        />
                      </div>
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="System Defaults & Formats"
                    description="Base regional conventions and formatting rules."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SettingsSelect
                        label="Default Currency"
                        value={general.defaultCurrency}
                        onChange={(e) =>
                          setGeneral({ ...general, defaultCurrency: e.target.value })
                        }
                        options={[
                          { value: "INR", label: "INR (₹) - Indian Rupee" },
                          { value: "USD", label: "USD ($) - US Dollar" },
                          { value: "EUR", label: "EUR (€) - Euro" },
                          { value: "GBP", label: "GBP (£) - British Pound" },
                        ]}
                      />
                      <SettingsSelect
                        label="Default Time Zone"
                        value={general.defaultTimeZone}
                        onChange={(e) =>
                          setGeneral({ ...general, defaultTimeZone: e.target.value })
                        }
                        options={[
                          { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+5:30)" },
                          { value: "UTC", label: "UTC (Coordinated Universal Time)" },
                          { value: "America/New_York", label: "America/New_York (EST/EDT)" },
                          { value: "Europe/London", label: "Europe/London (GMT/BST)" },
                          { value: "Asia/Singapore", label: "Asia/Singapore (SGT, UTC+8)" },
                          { value: "Asia/Dubai", label: "Asia/Dubai (GST, UTC+4)" },
                        ]}
                      />
                      <SettingsSelect
                        label="Default Language"
                        value={general.defaultLanguage}
                        onChange={(e) =>
                          setGeneral({ ...general, defaultLanguage: e.target.value })
                        }
                        options={[
                          { value: "en", label: "English (en)" },
                          { value: "hi", label: "Hindi (hi)" },
                          { value: "es", label: "Spanish (es)" },
                          { value: "fr", label: "French (fr)" },
                          { value: "de", label: "German (de)" },
                        ]}
                      />
                      <SettingsSelect
                        label="Date Format"
                        value={general.dateFormat}
                        onChange={(e) =>
                          setGeneral({ ...general, dateFormat: e.target.value })
                        }
                        options={[
                          { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 31/10/2026)" },
                          { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 10/31/2026)" },
                          { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g. 2026-10-31)" },
                        ]}
                      />
                      <div className="md:col-span-2">
                        <SettingsSelect
                          label="Number Format"
                          value={general.numberFormat}
                          onChange={(e) =>
                            setGeneral({ ...general, numberFormat: e.target.value })
                          }
                          options={[
                            { value: "en-IN", label: "Indian: 1,23,456.78 (Lakhs / Crores)" },
                            { value: "en-US", label: "International: 123,456.78 (Thousands / Millions)" },
                            { value: "de-DE", label: "European: 123.456,78 (Period thousands, comma decimal)" },
                          ]}
                        />
                      </div>
                    </div>
                  </SettingsCard>
                </div>
              )}

              {/* ==================================================== */}
              {/* 2. COMPANY PROFILE */}
              {/* ==================================================== */}
              {activeTab === SettingsCategory.COMPANY && company && (
                <div className="space-y-6">
                  <SettingsCard
                    title="Company Branding"
                    description="Upload your corporate emblem for invoices, receipts and customer proposals."
                  >
                    <LogoUploader
                      currentLogo={company.companyLogo}
                      onUpload={handleLogoUpload}
                      onRemove={handleLogoDelete}
                    />
                  </SettingsCard>

                  <SettingsCard
                    title="Legal Business Details"
                    description="Registered company information used for official billing and tax invoices."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SettingsInput
                        label="Legal Company Name"
                        value={company.legalCompanyName}
                        onChange={(e) =>
                          setCompany({ ...company, legalCompanyName: e.target.value })
                        }
                        placeholder="Brightloop Technologies Private Limited"
                        required
                      />
                      <SettingsInput
                        label="Trade / Display Name"
                        value={company.displayName}
                        onChange={(e) =>
                          setCompany({ ...company, displayName: e.target.value })
                        }
                        placeholder="Brightloop"
                      />
                      <SettingsInput
                        label="Business Email"
                        type="email"
                        value={company.businessEmail}
                        onChange={(e) =>
                          setCompany({ ...company, businessEmail: e.target.value })
                        }
                        placeholder="billing@brightloop.io"
                        required
                      />
                      <SettingsInput
                        label="Phone Number"
                        value={company.phoneNumber}
                        onChange={(e) =>
                          setCompany({ ...company, phoneNumber: e.target.value })
                        }
                        placeholder="+91 80 4123 4567"
                      />
                      <div className="md:col-span-2">
                        <SettingsInput
                          label="Company Website"
                          type="url"
                          value={company.website}
                          onChange={(e) =>
                            setCompany({ ...company, website: e.target.value })
                          }
                          placeholder="https://brightloop.io"
                        />
                      </div>
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Registered Office Address"
                    description="This address is printed on tax invoices, credit notes and quotations."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <SettingsInput
                          label="Address Line 1"
                          value={company.addressLine1}
                          onChange={(e) =>
                            setCompany({ ...company, addressLine1: e.target.value })
                          }
                          placeholder="Suite 401, Tech Park Avenue"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <SettingsInput
                          label="Address Line 2 (Optional)"
                          value={company.addressLine2}
                          onChange={(e) =>
                            setCompany({ ...company, addressLine2: e.target.value })
                          }
                          placeholder="Outer Ring Road, Bellandur"
                        />
                      </div>
                      <SettingsInput
                        label="City"
                        value={company.city}
                        onChange={(e) =>
                          setCompany({ ...company, city: e.target.value })
                        }
                        placeholder="Bengaluru"
                        required
                      />
                      <SettingsInput
                        label="State / Province"
                        value={company.state}
                        onChange={(e) =>
                          setCompany({ ...company, state: e.target.value })
                        }
                        placeholder="Karnataka"
                        required
                      />
                      <SettingsInput
                        label="Postal / ZIP Code"
                        value={company.postalCode}
                        onChange={(e) =>
                          setCompany({ ...company, postalCode: e.target.value })
                        }
                        placeholder="560103"
                        required
                      />
                      <SettingsInput
                        label="Country"
                        value={company.country}
                        onChange={(e) =>
                          setCompany({ ...company, country: e.target.value })
                        }
                        placeholder="India"
                        required
                      />
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Tax & Statutory Registrations"
                    description="Compliance identification numbers displayed on tax breakdown summaries."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SettingsInput
                        label="Tax Registration Number / GSTIN"
                        value={company.taxRegistrationNumber}
                        onChange={(e) =>
                          setCompany({
                            ...company,
                            taxRegistrationNumber: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="29AAAAA0000A1Z5"
                        description="15-character Goods & Services Tax Identification Number"
                      />
                      <SettingsInput
                        label="Company Registration Number / CIN"
                        value={company.companyRegistrationNumber}
                        onChange={(e) =>
                          setCompany({
                            ...company,
                            companyRegistrationNumber: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="U72900KA2026PTC123456"
                        description="Corporate Identification Number"
                      />
                    </div>
                  </SettingsCard>
                </div>
              )}

              {/* ==================================================== */}
              {/* 3. BILLING & PAYMENTS */}
              {/* ==================================================== */}
              {activeTab === SettingsCategory.BILLING && billing && (
                <div className="space-y-6">
                  <SettingsCard
                    title="Default Billing Defaults"
                    description="Baseline payment criteria assigned to newly created invoices and subscriptions."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <SettingsSelect
                        label="Default Currency"
                        value={billing.defaultCurrency}
                        onChange={(e) =>
                          setBilling({ ...billing, defaultCurrency: e.target.value })
                        }
                        options={[
                          { value: "INR", label: "INR (₹) - Indian Rupee" },
                          { value: "USD", label: "USD ($) - US Dollar" },
                          { value: "EUR", label: "EUR (€) - Euro" },
                          { value: "GBP", label: "GBP (£) - British Pound" },
                        ]}
                      />
                      <SettingsSelect
                        label="Default Payment Terms"
                        value={billing.defaultPaymentTerms}
                        onChange={(e) =>
                          setBilling({ ...billing, defaultPaymentTerms: e.target.value })
                        }
                        options={[
                          { value: "IMMEDIATE", label: "Due immediately" },
                          { value: "7_DAYS", label: "Net 7 days" },
                          { value: "15_DAYS", label: "Net 15 days" },
                          { value: "30_DAYS", label: "Net 30 days" },
                          { value: "45_DAYS", label: "Net 45 days" },
                          { value: "60_DAYS", label: "Net 60 days" },
                        ]}
                      />
                      <SettingsSelect
                        label="Default Payment Method"
                        value={billing.defaultPaymentMethod}
                        onChange={(e) =>
                          setBilling({ ...billing, defaultPaymentMethod: e.target.value })
                        }
                        options={[
                          { value: "UPI", label: "UPI (Unified Payments Interface)" },
                          { value: "BANK_TRANSFER", label: "Bank Transfer (NEFT/RTGS/IMPS)" },
                          { value: "CARD", label: "Card (Debit / Credit)" },
                          { value: "CASH", label: "Cash" },
                          { value: "OTHER", label: "Other" },
                        ]}
                      />
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Payment Collection Governance"
                    description="Control reconciliation and partial installment allocations."
                  >
                    <div className="divide-y divide-[#E5EAF1]">
                      <SettingsToggle
                        label="Allow Partial Payments"
                        description="Permit customers to settle an invoice across multiple partial installments."
                        checked={billing.allowPartialPayments}
                        onChange={(checked) =>
                          setBilling({ ...billing, allowPartialPayments: checked })
                        }
                      />
                      <SettingsToggle
                        label="Allow Multiple Payments per Invoice"
                        description="Permit recording distinct payments against a single invoice item."
                        checked={billing.allowMultiplePaymentsPerInvoice}
                        onChange={(checked) =>
                          setBilling({
                            ...billing,
                            allowMultiplePaymentsPerInvoice: checked,
                          })
                        }
                      />
                      <SettingsToggle
                        label="Automatically Mark Invoice as Paid When Fully Paid"
                        description="Transition invoice status from ISSUED or PARTIALLY_PAID to PAID when zero balance remains."
                        checked={billing.autoMarkPaidWhenFullyPaid}
                        onChange={(checked) =>
                          setBilling({
                            ...billing,
                            autoMarkPaidWhenFullyPaid: checked,
                          })
                        }
                      />
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Bank Account Transfer Details"
                    description="Coordinates printed on customer invoices for direct wire or bank transfer."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SettingsInput
                        label="Bank Name"
                        value={billing.bankAccountDetails?.bankName || ""}
                        onChange={(e) =>
                          setBilling({
                            ...billing,
                            bankAccountDetails: {
                              ...billing.bankAccountDetails,
                              bankName: e.target.value,
                            },
                          })
                        }
                        placeholder="HDFC Bank"
                      />
                      <SettingsInput
                        label="Account Number"
                        value={billing.bankAccountDetails?.accountNumber || ""}
                        onChange={(e) =>
                          setBilling({
                            ...billing,
                            bankAccountDetails: {
                              ...billing.bankAccountDetails,
                              accountNumber: e.target.value,
                            },
                          })
                        }
                        placeholder="50200012345678"
                      />
                      <SettingsInput
                        label="Account Holder / Beneficiary Name"
                        value={billing.bankAccountDetails?.accountName || ""}
                        onChange={(e) =>
                          setBilling({
                            ...billing,
                            bankAccountDetails: {
                              ...billing.bankAccountDetails,
                              accountName: e.target.value,
                            },
                          })
                        }
                        placeholder="Brightloop Technologies Pvt Ltd"
                      />
                      <SettingsInput
                        label="IFSC Code"
                        value={billing.bankAccountDetails?.ifscCode || ""}
                        onChange={(e) =>
                          setBilling({
                            ...billing,
                            bankAccountDetails: {
                              ...billing.bankAccountDetails,
                              ifscCode: e.target.value.toUpperCase(),
                            },
                          })
                        }
                        placeholder="HDFC0001234"
                      />
                      <div className="md:col-span-2">
                        <SettingsInput
                          label="Branch Name"
                          value={billing.bankAccountDetails?.branch || ""}
                          onChange={(e) =>
                            setBilling({
                              ...billing,
                              bankAccountDetails: {
                                ...billing.bankAccountDetails,
                                branch: e.target.value,
                              },
                            })
                          }
                          placeholder="Koramangala 4th Block, Bengaluru"
                        />
                      </div>
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Customer Payment Instructions"
                    description="Standard remittance remarks and UPI guidelines printed at the bottom of the invoice."
                  >
                    <SettingsTextarea
                      label="Payment Remittance Instructions"
                      value={billing.paymentInstructions}
                      onChange={(e) =>
                        setBilling({ ...billing, paymentInstructions: e.target.value })
                      }
                      rows={4}
                      placeholder="Please quote the invoice number when making payments via wire transfer or UPI. For electronic payments, remit to brightloop@okhdfcbank."
                    />
                  </SettingsCard>
                </div>
              )}

              {/* ==================================================== */}
              {/* 4. INVOICES */}
              {/* ==================================================== */}
              {activeTab === SettingsCategory.INVOICES && invoices && (
                <div className="space-y-6">
                  <SettingsCard
                    title="Invoice Numbering Sequence"
                    description="Configure the sequential prefix and numbering scheme. Concurrency-safe and immutable for existing invoices."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <SettingsInput
                        label="Invoice Prefix"
                        value={invoices.invoicePrefix}
                        onChange={(e) =>
                          setInvoices({
                            ...invoices,
                            invoicePrefix: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="INV"
                        required
                      />
                      <SettingsInput
                        label="Starting Number"
                        type="number"
                        min={1}
                        value={invoices.startingInvoiceNumber}
                        onChange={(e) =>
                          setInvoices({
                            ...invoices,
                            startingInvoiceNumber: parseInt(e.target.value) || 1,
                          })
                        }
                        required
                      />
                      <div>
                        <label className="block text-[13px] font-medium text-[#172033] mb-1.5">
                          Next Generated Number (Live)
                        </label>
                        <div className="h-9 px-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-md flex items-center justify-between text-[13px] font-mono text-[#315CF5]">
                          <span>
                            {invoices.invoicePrefix}-
                            {String(invoices.nextInvoiceNumber).padStart(4, "0")}
                          </span>
                          <span className="text-[10px] uppercase font-sans font-semibold px-1.5 py-0.5 bg-[#EEF2FF] text-[#315CF5] rounded">
                            Dynamic
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3.5 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[12px] font-medium text-[#172033]">
                          Live Numbering Preview
                        </span>
                        <p className="text-[11px] text-[#64748B]">
                          Format applied to future invoices generated by the billing engine
                        </p>
                      </div>
                      <span className="font-mono text-[14px] font-bold text-[#172033] bg-white px-3 py-1 rounded border border-[#CBD5E1]">
                        {invoices.invoicePrefix}-2026-
                        {String(invoices.nextInvoiceNumber).padStart(4, "0")}
                      </span>
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Invoice Presentation Layout"
                    description="Choose which visual components are rendered on downloaded PDF or web invoices."
                  >
                    <div className="divide-y divide-[#E5EAF1]">
                      <SettingsToggle
                        label="Display Company Logo"
                        description="Render your uploaded corporate logo on the top header of the invoice."
                        checked={invoices.displayCompanyLogo}
                        onChange={(checked) =>
                          setInvoices({ ...invoices, displayCompanyLogo: checked })
                        }
                      />
                      <SettingsToggle
                        label="Display Tax Breakdown Table"
                        description="Show explicit CGST, SGST, IGST and base amount breakdown lines."
                        checked={invoices.displayTaxBreakdown}
                        onChange={(checked) =>
                          setInvoices({ ...invoices, displayTaxBreakdown: checked })
                        }
                      />
                      <SettingsToggle
                        label="Display Customer Address"
                        description="Include the billing and registered address of the customer."
                        checked={invoices.displayCustomerAddress}
                        onChange={(checked) =>
                          setInvoices({ ...invoices, displayCustomerAddress: checked })
                        }
                      />
                      <SettingsToggle
                        label="Display Payment Instructions"
                        description="Print bank account and remittance directions at the bottom of the invoice."
                        checked={invoices.displayPaymentInstructions}
                        onChange={(checked) =>
                          setInvoices({
                            ...invoices,
                            displayPaymentInstructions: checked,
                          })
                        }
                      />
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Automated Invoice Lifecycle"
                    description="Configure recurring invoice generation and background triggers."
                  >
                    <div className="divide-y divide-[#E5EAF1]">
                      <SettingsToggle
                        label="Automatically Generate Recurring Invoices"
                        description="Let the billing engine create periodic invoices for active subscriptions on their renewal date."
                        checked={invoices.autoGenerateRecurringInvoices}
                        onChange={(checked) =>
                          setInvoices({
                            ...invoices,
                            autoGenerateRecurringInvoices: checked,
                          })
                        }
                      />
                      <SettingsToggle
                        label="Automatically Send Invoice Email"
                        description="Dispatch the invoice PDF and link to the customer upon issuance."
                        checked={invoices.autoSendInvoiceEmail}
                        onChange={(checked) =>
                          setInvoices({ ...invoices, autoSendInvoiceEmail: checked })
                        }
                      />
                      <SettingsToggle
                        label="Automatically Mark Overdue Invoices"
                        description="Transition unpaid invoices to OVERDUE when the due date has passed."
                        checked={invoices.autoMarkOverdueInvoices}
                        onChange={(checked) =>
                          setInvoices({ ...invoices, autoMarkOverdueInvoices: checked })
                        }
                      />
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Invoice Defaults & Terms"
                    description="Default payment period, terms and remarks applied to newly created invoices."
                  >
                    <div className="space-y-4">
                      <div className="w-full sm:w-64">
                        <SettingsInput
                          label="Default Due Period (Days)"
                          type="number"
                          min={0}
                          max={365}
                          value={invoices.defaultDueDays}
                          onChange={(e) =>
                            setInvoices({
                              ...invoices,
                              defaultDueDays: parseInt(e.target.value) || 15,
                            })
                          }
                          suffixText="Days"
                          required
                        />
                      </div>
                      <SettingsTextarea
                        label="Default Invoice Notes"
                        value={invoices.defaultInvoiceNotes}
                        onChange={(e) =>
                          setInvoices({ ...invoices, defaultInvoiceNotes: e.target.value })
                        }
                        rows={3}
                        placeholder="Thank you for your business. Please reach out to billing@brightloop.io with any queries."
                      />
                      <SettingsTextarea
                        label="Default Invoice Footer / Legal Disclaimer"
                        value={invoices.defaultInvoiceFooter}
                        onChange={(e) =>
                          setInvoices({
                            ...invoices,
                            defaultInvoiceFooter: e.target.value,
                          })
                        }
                        rows={2}
                        placeholder="This is a computer-generated tax invoice and does not require a physical signature."
                      />
                    </div>
                  </SettingsCard>
                </div>
              )}

              {/* ==================================================== */}
              {/* 5. SUBSCRIPTIONS */}
              {/* ==================================================== */}
              {activeTab === SettingsCategory.SUBSCRIPTIONS && subscriptions && (
                <div className="space-y-6">
                  <SettingsCard
                    title="Default Subscription Parameters"
                    description="Global defaults applied when creating plans or enrolling customers."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <SettingsSelect
                        label="Default Status"
                        value={subscriptions.defaultSubscriptionStatus}
                        onChange={(e) =>
                          setSubscriptions({
                            ...subscriptions,
                            defaultSubscriptionStatus: e.target.value,
                          })
                        }
                        options={[
                          { value: "ACTIVE", label: "Active" },
                          { value: "TRIALING", label: "Trialing" },
                        ]}
                      />
                      <SettingsSelect
                        label="Default Billing Cycle"
                        value={subscriptions.defaultBillingCycle}
                        onChange={(e) =>
                          setSubscriptions({
                            ...subscriptions,
                            defaultBillingCycle: e.target.value,
                          })
                        }
                        options={[
                          { value: "MONTHLY", label: "Monthly" },
                          { value: "YEARLY", label: "Yearly" },
                          { value: "QUARTERLY", label: "Quarterly" },
                          { value: "WEEKLY", label: "Weekly" },
                        ]}
                      />
                      <SettingsInput
                        label="Default Trial Period"
                        type="number"
                        min={0}
                        max={365}
                        value={subscriptions.defaultTrialPeriodDays}
                        onChange={(e) =>
                          setSubscriptions({
                            ...subscriptions,
                            defaultTrialPeriodDays: parseInt(e.target.value) || 0,
                          })
                        }
                        suffixText="Days"
                      />
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Subscription Lifecycle Policies"
                    description="Allow or restrict customer-initiated changes to active subscription contracts."
                  >
                    <div className="divide-y divide-[#E5EAF1]">
                      <SettingsToggle
                        label="Allow Subscription Pause"
                        description="Permit customers or staff to temporarily pause a subscription without terminating it."
                        checked={subscriptions.allowSubscriptionPause}
                        onChange={(checked) =>
                          setSubscriptions({
                            ...subscriptions,
                            allowSubscriptionPause: checked,
                          })
                        }
                      />
                      <SettingsToggle
                        label="Allow Subscription Resume"
                        description="Permit re-activating a paused subscription."
                        checked={subscriptions.allowSubscriptionResume}
                        onChange={(checked) =>
                          setSubscriptions({
                            ...subscriptions,
                            allowSubscriptionResume: checked,
                          })
                        }
                      />
                      <SettingsToggle
                        label="Allow Early Cancellation"
                        description="Permit customers to cancel their recurring subscription before the period end."
                        checked={subscriptions.allowEarlyCancellation}
                        onChange={(checked) =>
                          setSubscriptions({
                            ...subscriptions,
                            allowEarlyCancellation: checked,
                          })
                        }
                      />
                      <SettingsToggle
                        label="Allow Subscription Renewal"
                        description="Allow manually or automatically renewing expired subscriptions."
                        checked={subscriptions.allowSubscriptionRenewal}
                        onChange={(checked) =>
                          setSubscriptions({
                            ...subscriptions,
                            allowSubscriptionRenewal: checked,
                          })
                        }
                      />
                      <SettingsToggle
                        label="Automatically Renew Eligible Subscriptions"
                        description="When enabled, the billing engine will attempt renewal charges on the expiration date."
                        checked={subscriptions.autoRenewEligibleSubscriptions}
                        onChange={(checked) =>
                          setSubscriptions({
                            ...subscriptions,
                            autoRenewEligibleSubscriptions: checked,
                          })
                        }
                      />
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Lifecycle Reminders & Notifications"
                    description="Trigger automated emails before subscriptions expire or renew."
                  >
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                        <div className="space-y-0.5">
                          <span className="text-[13px] font-medium text-[#172033]">
                            Renewal Reminders
                          </span>
                          <p className="text-[12px] text-[#64748B]">
                            Notify customers that their subscription will auto-renew soon.
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <SettingsInput
                            label=""
                            type="number"
                            min={1}
                            max={60}
                            value={subscriptions.renewalReminderDaysBefore}
                            onChange={(e) =>
                              setSubscriptions({
                                ...subscriptions,
                                renewalReminderDaysBefore: parseInt(e.target.value) || 7,
                              })
                            }
                            suffixText="days prior"
                            className="w-32"
                            disabled={!subscriptions.sendRenewalReminder}
                          />
                          <SettingsToggle
                            label=""
                            checked={subscriptions.sendRenewalReminder}
                            onChange={(checked) =>
                              setSubscriptions({
                                ...subscriptions,
                                sendRenewalReminder: checked,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                        <div className="space-y-0.5">
                          <span className="text-[13px] font-medium text-[#172033]">
                            Expiry Reminders
                          </span>
                          <p className="text-[12px] text-[#64748B]">
                            Warn customers of impending plan expiration if non-renewing.
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <SettingsInput
                            label=""
                            type="number"
                            min={1}
                            max={60}
                            value={subscriptions.expiryReminderDaysBefore}
                            onChange={(e) =>
                              setSubscriptions({
                                ...subscriptions,
                                expiryReminderDaysBefore: parseInt(e.target.value) || 3,
                              })
                            }
                            suffixText="days prior"
                            className="w-32"
                            disabled={!subscriptions.sendExpiryReminder}
                          />
                          <SettingsToggle
                            label=""
                            checked={subscriptions.sendExpiryReminder}
                            onChange={(checked) =>
                              setSubscriptions({
                                ...subscriptions,
                                sendExpiryReminder: checked,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </SettingsCard>
                </div>
              )}

              {/* ==================================================== */}
              {/* 6. NOTIFICATIONS */}
              {/* ==================================================== */}
              {activeTab === SettingsCategory.NOTIFICATIONS && notifications && (
                <div className="space-y-6">
                  <SettingsCard
                    title="Email Service Configuration"
                    description="Sender identities and email gateway status. Passwords and API keys are protected on the backend."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <SettingsInput
                        label="Sender Display Name"
                        value={notifications.senderDisplayName}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            senderDisplayName: e.target.value,
                          })
                        }
                        placeholder="Brightloop Billing"
                        required
                      />
                      <SettingsInput
                        label="Sender Email Address"
                        type="email"
                        value={notifications.senderEmailAddress}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            senderEmailAddress: e.target.value,
                          })
                        }
                        placeholder="billing@brightloop.io"
                        required
                      />
                      <div>
                        <label className="block text-[13px] font-medium text-[#172033] mb-1.5">
                          Provider Status
                        </label>
                        <div className="h-9 px-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-md flex items-center justify-between text-[13px]">
                          <span className="text-[#172033] font-medium">SMTP Gateway</span>
                          <span
                            className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                              notifications.emailProviderStatus === "ACTIVE"
                                ? "bg-[#DCFCE7] text-[#15803D]"
                                : notifications.emailProviderStatus === "CONFIGURED"
                                ? "bg-[#EFF6FF] text-[#1D4ED8]"
                                : "bg-[#FEF3C7] text-[#B45309]"
                            }`}
                          >
                            {notifications.emailProviderStatus}
                          </span>
                        </div>
                      </div>
                      <div className="md:col-span-3">
                        <SettingsInput
                          label="Administrator Notification Email"
                          type="email"
                          value={notifications.adminNotificationEmail}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              adminNotificationEmail: e.target.value,
                            })
                          }
                          placeholder="admin@brightloop.io"
                          description="Target address for high-priority platform alerts, failed runs, and large transactions."
                          required
                        />
                      </div>
                    </div>
                  </SettingsCard>

                  {/* Send Test Email Card */}
                  <SettingsCard
                    title="Send Test Email"
                    description="Verify that your SMTP provider or mock email service successfully delivers messages."
                  >
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                      <div className="flex-1 w-full">
                        <SettingsInput
                          label="Recipient Email Address"
                          type="email"
                          value={testEmailRecipient}
                          onChange={(e) => setTestEmailRecipient(e.target.value)}
                          placeholder="test@example.com"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendTestEmail}
                        disabled={sendingTestEmail || !testEmailRecipient}
                        className="inline-flex items-center space-x-2 px-4 py-2 h-9 rounded-md bg-[#172033] text-white text-[13px] font-medium hover:bg-[#0F172A] transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      >
                        {sendingTestEmail ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Send Test Email</span>
                          </>
                        )}
                      </button>
                    </div>

                    {testEmailResult && (
                      <div
                        className={`mt-3 p-3 rounded-md text-[12px] flex items-center space-x-2 ${
                          testEmailResult.success
                            ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]"
                            : "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                        }`}
                      >
                        {testEmailResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0" />
                        )}
                        <span>{testEmailResult.message}</span>
                      </div>
                    )}
                  </SettingsCard>

                  {/* Customer Notifications Matrix */}
                  <SettingsCard
                    title="Customer Notifications (15 Events)"
                    description="Manage automated transactional messages sent to customer contact emails."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 divide-y md:divide-y-0 divide-[#E5EAF1]">
                      <div className="space-y-1 divide-y divide-[#E5EAF1]">
                        <SettingsToggle
                          label="Welcome Email"
                          description="Sent upon user registration or customer portal setup"
                          checked={notifications.customerWelcomeEmail}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerWelcomeEmail: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Password Reset Email"
                          description="Password assistance link and verification code"
                          checked={notifications.customerPasswordResetEmail}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerPasswordResetEmail: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Quotation Created"
                          description="Sent when a new quotation proposal is drafted"
                          checked={notifications.customerQuotationCreated}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerQuotationCreated: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Quotation Accepted"
                          description="Confirmation email when customer accepts proposal"
                          checked={notifications.customerQuotationAccepted}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerQuotationAccepted: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Quotation Rejected"
                          description="Notice of quotation decline"
                          checked={notifications.customerQuotationRejected}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerQuotationRejected: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Subscription Activated"
                          description="Sent when a subscription goes live"
                          checked={notifications.customerSubscriptionActivated}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerSubscriptionActivated: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Subscription Paused"
                          description="Notice that service is temporarily suspended"
                          checked={notifications.customerSubscriptionPaused}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerSubscriptionPaused: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Subscription Resumed"
                          description="Notice that paused service has resumed"
                          checked={notifications.customerSubscriptionResumed}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerSubscriptionResumed: c,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-1 divide-y divide-[#E5EAF1]">
                        <SettingsToggle
                          label="Subscription Cancelled"
                          description="Confirmation of cancellation"
                          checked={notifications.customerSubscriptionCancelled}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerSubscriptionCancelled: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Subscription Renewed"
                          description="Notice of successful billing cycle renewal"
                          checked={notifications.customerSubscriptionRenewed}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerSubscriptionRenewed: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Invoice Generated"
                          description="Electronic tax invoice copy and payment link"
                          checked={notifications.customerInvoiceGenerated}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerInvoiceGenerated: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Invoice Due Reminder"
                          description="Upcoming due date payment reminder"
                          checked={notifications.customerInvoiceDueReminder}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerInvoiceDueReminder: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Payment Received"
                          description="Receipt confirming settlement of an invoice"
                          checked={notifications.customerPaymentReceived}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerPaymentReceived: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Payment Failed"
                          description="Warning that payment transaction could not be completed"
                          checked={notifications.customerPaymentFailed}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerPaymentFailed: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Subscription Expiry Reminder"
                          description="Notice prior to termination of term"
                          checked={notifications.customerSubscriptionExpiryReminder}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              customerSubscriptionExpiryReminder: c,
                            })
                          }
                        />
                      </div>
                    </div>
                  </SettingsCard>

                  {/* Administrator Alerts Matrix */}
                  <SettingsCard
                    title="Administrator Alerts (6 Events)"
                    description="Internal operational notifications dispatched to the admin inbox."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 divide-y md:divide-y-0 divide-[#E5EAF1]">
                      <div className="space-y-1 divide-y divide-[#E5EAF1]">
                        <SettingsToggle
                          label="New Customer Registration"
                          description="Alert when a new account is registered"
                          checked={notifications.adminNewCustomerRegistration}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              adminNewCustomerRegistration: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="New Subscription Created"
                          description="Alert when a subscription order is placed"
                          checked={notifications.adminNewSubscriptionCreated}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              adminNewSubscriptionCreated: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Payment Received"
                          description="Real-time alert for incoming revenue transactions"
                          checked={notifications.adminPaymentReceived}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              adminPaymentReceived: c,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-1 divide-y divide-[#E5EAF1]">
                        <SettingsToggle
                          label="Payment Failed"
                          description="Alert on credit card declines or broken webhooks"
                          checked={notifications.adminPaymentFailed}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              adminPaymentFailed: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Invoice Overdue"
                          description="Alert when customer accounts lapse past grace period"
                          checked={notifications.adminInvoiceOverdue}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              adminInvoiceOverdue: c,
                            })
                          }
                        />
                        <SettingsToggle
                          label="Billing Generation Failed"
                          description="Critical alarm if a background cron run encounters an error"
                          checked={notifications.adminBillingGenerationFailed}
                          onChange={(c) =>
                            setNotifications({
                              ...notifications,
                              adminBillingGenerationFailed: c,
                            })
                          }
                        />
                      </div>
                    </div>
                  </SettingsCard>
                </div>
              )}

              {/* ==================================================== */}
              {/* 7. SECURITY SETTINGS */}
              {/* ==================================================== */}
              {activeTab === SettingsCategory.SECURITY && security && (
                <div className="space-y-6">
                  <SettingsCard
                    title="Authentication & Password Policy"
                    description="Enforced on user registration, password changes and staff onboarding by the backend API."
                  >
                    <div className="space-y-4">
                      <div className="w-full sm:w-64">
                        <SettingsInput
                          label="Minimum Password Length"
                          type="number"
                          min={8}
                          max={64}
                          value={security.minPasswordLength}
                          onChange={(e) =>
                            setSecurity({
                              ...security,
                              minPasswordLength: parseInt(e.target.value) || 9,
                            })
                          }
                          description="Default: 9 characters minimum"
                          required
                        />
                      </div>

                      <div className="divide-y divide-[#E5EAF1]">
                        <SettingsToggle
                          label="Require Uppercase Letter"
                          description="Must include at least one uppercase letter (A-Z)"
                          checked={security.requireUppercase}
                          onChange={(c) =>
                            setSecurity({ ...security, requireUppercase: c })
                          }
                        />
                        <SettingsToggle
                          label="Require Lowercase Letter"
                          description="Must include at least one lowercase letter (a-z)"
                          checked={security.requireLowercase}
                          onChange={(c) =>
                            setSecurity({ ...security, requireLowercase: c })
                          }
                        />
                        <SettingsToggle
                          label="Require Special Character"
                          description="Must include at least one symbol (e.g. !@#$%^&*)"
                          checked={security.requireSpecialCharacter}
                          onChange={(c) =>
                            setSecurity({ ...security, requireSpecialCharacter: c })
                          }
                        />
                        <SettingsToggle
                          label="Require Email Verification"
                          description="Users must confirm their email address before accessing the portal."
                          checked={security.requireEmailVerification}
                          onChange={(c) =>
                            setSecurity({ ...security, requireEmailVerification: c })
                          }
                        />
                      </div>
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Session & Access Governance"
                    description="Limits and durations governing user authentication sessions and lockout safeguards."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <SettingsInput
                        label="Session Expiration Duration"
                        type="number"
                        min={15}
                        max={10080}
                        value={security.sessionExpirationDurationMinutes}
                        onChange={(e) =>
                          setSecurity({
                            ...security,
                            sessionExpirationDurationMinutes:
                              parseInt(e.target.value) || 1440,
                          })
                        }
                        suffixText="Minutes"
                        description="Applies to newly issued session tokens"
                      />
                      <SettingsInput
                        label="Max Failed Login Attempts"
                        type="number"
                        min={3}
                        max={20}
                        value={security.maxFailedLoginAttempts}
                        onChange={(e) =>
                          setSecurity({
                            ...security,
                            maxFailedLoginAttempts: parseInt(e.target.value) || 5,
                          })
                        }
                        suffixText="Attempts"
                        description="Triggers account lockout if exceeded"
                      />
                      <SettingsInput
                        label="Account Lockout Duration"
                        type="number"
                        min={5}
                        max={1440}
                        value={security.accountLockoutDurationMinutes}
                        onChange={(e) =>
                          setSecurity({
                            ...security,
                            accountLockoutDurationMinutes:
                              parseInt(e.target.value) || 15,
                          })
                        }
                        suffixText="Minutes"
                        description="Cooldown period before retrying login"
                      />
                    </div>
                  </SettingsCard>

                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] flex items-start space-x-3">
                    <ShieldAlert className="w-5 h-5 text-[#315CF5] shrink-0 mt-0.5" />
                    <div className="text-[12px] text-[#64748B] space-y-1">
                      <span className="font-semibold text-[#172033] block">
                        Strict Security Guarantees
                      </span>
                      <p>
                        Password hashes, refresh tokens, and JWT secrets are securely
                        encapsulated on the server and never returned in settings payloads.
                        All policy changes are recorded in the system audit log.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* 8. REGIONAL PREFERENCES */}
              {/* ==================================================== */}
              {activeTab === SettingsCategory.REGIONAL && regional && (
                <div className="space-y-6">
                  <SettingsCard
                    title="Regional Formatting & Localization"
                    description="Standardize currency, timezone, timestamp and numerical representation across all modules."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SettingsSelect
                        label="Default Base Currency"
                        value={regional.defaultCurrency}
                        onChange={(e) =>
                          setRegional({ ...regional, defaultCurrency: e.target.value })
                        }
                        options={[
                          { value: "INR", label: "INR (₹) - Indian Rupee" },
                          { value: "USD", label: "USD ($) - US Dollar" },
                          { value: "EUR", label: "EUR (€) - Euro" },
                          { value: "GBP", label: "GBP (£) - British Pound" },
                        ]}
                      />
                      <SettingsSelect
                        label="Standard Time Zone"
                        value={regional.timeZone}
                        onChange={(e) =>
                          setRegional({ ...regional, timeZone: e.target.value })
                        }
                        options={[
                          { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+5:30)" },
                          { value: "UTC", label: "UTC (Coordinated Universal Time)" },
                          { value: "America/New_York", label: "America/New_York (EST/EDT)" },
                          { value: "Europe/London", label: "Europe/London (GMT/BST)" },
                          { value: "Asia/Singapore", label: "Asia/Singapore (SGT, UTC+8)" },
                          { value: "Asia/Dubai", label: "Asia/Dubai (GST, UTC+4)" },
                        ]}
                      />
                      <SettingsSelect
                        label="Date Format"
                        value={regional.dateFormat}
                        onChange={(e) =>
                          setRegional({ ...regional, dateFormat: e.target.value })
                        }
                        options={[
                          { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/10/2026)" },
                          { value: "MM/DD/YYYY", label: "MM/DD/YYYY (10/31/2026)" },
                          { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2026-10-31)" },
                        ]}
                      />
                      <SettingsSelect
                        label="Time Format"
                        value={regional.timeFormat}
                        onChange={(e) =>
                          setRegional({
                            ...regional,
                            timeFormat: e.target.value as "12_HOUR" | "24_HOUR",
                          })
                        }
                        options={[
                          { value: "12_HOUR", label: "12-hour format (e.g. 04:30 PM)" },
                          { value: "24_HOUR", label: "24-hour format (e.g. 16:30)" },
                        ]}
                      />
                      <SettingsSelect
                        label="Number Format Convention"
                        value={regional.numberFormat}
                        onChange={(e) =>
                          setRegional({
                            ...regional,
                            numberFormat: e.target.value as "en-IN" | "en-US" | "de-DE",
                          })
                        }
                        options={[
                          { value: "en-IN", label: "Indian: 1,23,456.78 (Lakhs / Crores)" },
                          { value: "en-US", label: "International: 123,456.78 (Thousands / Millions)" },
                          { value: "de-DE", label: "European: 123.456,78 (Period thousand separator)" },
                        ]}
                      />
                      <SettingsSelect
                        label="Decimal Precision"
                        value={String(regional.decimalPrecision)}
                        onChange={(e) =>
                          setRegional({
                            ...regional,
                            decimalPrecision: parseInt(e.target.value) || 2,
                          })
                        }
                        options={[
                          { value: "0", label: "0 decimals (e.g. 1,000)" },
                          { value: "2", label: "2 decimals (e.g. 1,000.00)" },
                          { value: "3", label: "3 decimals (e.g. 1,000.000)" },
                          { value: "4", label: "4 decimals (e.g. 1,000.0000)" },
                        ]}
                      />
                      <div className="md:col-span-2">
                        <SettingsSelect
                          label="Tax Display Format"
                          value={regional.taxDisplayFormat}
                          onChange={(e) =>
                            setRegional({
                              ...regional,
                              taxDisplayFormat: e.target.value as "EXCLUSIVE" | "INCLUSIVE",
                            })
                          }
                          options={[
                            {
                              value: "EXCLUSIVE",
                              label: "Tax Exclusive (Taxes added on top of item base price)",
                            },
                            {
                              value: "INCLUSIVE",
                              label: "Tax Inclusive (Price shown includes all applicable GST/VAT)",
                            },
                          ]}
                        />
                      </div>
                    </div>
                  </SettingsCard>

                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] flex items-start space-x-3">
                    <Info className="w-5 h-5 text-[#315CF5] shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[#64748B]">
                      Monetary values are strictly stored as integer minor units in the database
                      to prevent floating point rounding inaccuracies. Changing the default currency
                      never modifies existing historical invoice or payment records.
                    </p>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* 9. SYSTEM INFORMATION */}
              {/* ==================================================== */}
              {activeTab === SettingsCategory.SYSTEM && system && (
                <div className="space-y-6">
                  {/* System Health Overview */}
                  <SettingsCard
                    title="Platform Health & Architecture"
                    description="Read-only diagnostic metrics for the Brightloop SMS environment."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                        <span className="text-[11px] font-semibold text-[#94A3B8] uppercase">
                          Application
                        </span>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[14px] font-bold text-[#172033]">
                            {system.appName}
                          </span>
                          <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-[#CBD5E1]">
                            v{system.appVersion}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                        <span className="text-[11px] font-semibold text-[#94A3B8] uppercase">
                          Environment
                        </span>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[14px] font-bold text-[#172033] capitalize">
                            {system.environment}
                          </span>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8]">
                            Node.js
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                        <span className="text-[11px] font-semibold text-[#94A3B8] uppercase">
                          Database Connection
                        </span>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[14px] font-bold text-[#172033]">
                            PostgreSQL
                          </span>
                          <span
                            className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                              system.databaseConnectionStatus === "CONNECTED"
                                ? "bg-[#DCFCE7] text-[#15803D]"
                                : "bg-[#FEE2E2] text-[#B91C1C]"
                            }`}
                          >
                            {system.databaseConnectionStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                        <Clock className="w-5 h-5 text-[#315CF5] shrink-0" />
                        <div>
                          <span className="text-[11px] text-[#64748B] block">Server Time (UTC)</span>
                          <span className="text-[13px] font-mono font-medium text-[#172033]">
                            {system.currentServerTime}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                        <Database className="w-5 h-5 text-[#315CF5] shrink-0" />
                        <div>
                          <span className="text-[11px] text-[#64748B] block">Latest Applied Migration</span>
                          <span className="text-[13px] font-mono font-medium text-[#172033]">
                            {system.lastDatabaseMigration}
                          </span>
                        </div>
                      </div>
                    </div>
                  </SettingsCard>

                  {/* Live Database Entity Counts */}
                  <SettingsCard
                    title="Live Database Entity Metrics"
                    description="Current record volume across primary operational modules."
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      <div className="p-3.5 bg-white rounded-lg border border-[#E5EAF1] shadow-2xs text-center">
                        <Users className="w-5 h-5 text-[#315CF5] mx-auto mb-1.5" />
                        <span className="text-[20px] font-bold text-[#172033] block">
                          {system.totalRegisteredUsers}
                        </span>
                        <span className="text-[11px] text-[#64748B]">Platform Users</span>
                      </div>

                      <div className="p-3.5 bg-white rounded-lg border border-[#E5EAF1] shadow-2xs text-center">
                        <UserCheck className="w-5 h-5 text-[#10B981] mx-auto mb-1.5" />
                        <span className="text-[20px] font-bold text-[#172033] block">
                          {system.totalCustomers}
                        </span>
                        <span className="text-[11px] text-[#64748B]">Customers</span>
                      </div>

                      <div className="p-3.5 bg-white rounded-lg border border-[#E5EAF1] shadow-2xs text-center">
                        <Package className="w-5 h-5 text-[#8B5CF6] mx-auto mb-1.5" />
                        <span className="text-[20px] font-bold text-[#172033] block">
                          {system.totalProducts}
                        </span>
                        <span className="text-[11px] text-[#64748B]">Products</span>
                      </div>

                      <div className="p-3.5 bg-white rounded-lg border border-[#E5EAF1] shadow-2xs text-center">
                        <Repeat className="w-5 h-5 text-[#F59E0B] mx-auto mb-1.5" />
                        <span className="text-[20px] font-bold text-[#172033] block">
                          {system.totalSubscriptions}
                        </span>
                        <span className="text-[11px] text-[#64748B]">Subscriptions</span>
                      </div>

                      <div className="p-3.5 bg-white rounded-lg border border-[#E5EAF1] shadow-2xs text-center col-span-2 sm:col-span-1">
                        <Receipt className="w-5 h-5 text-[#EC4899] mx-auto mb-1.5" />
                        <span className="text-[20px] font-bold text-[#172033] block">
                          {system.totalInvoices}
                        </span>
                        <span className="text-[11px] text-[#64748B]">Total Invoices</span>
                      </div>
                    </div>
                  </SettingsCard>

                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] flex items-start space-x-3">
                    <ShieldAlert className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[#64748B]">
                      <strong className="text-[#172033]">Redacted Credentials:</strong> Database connection strings, SMTP passwords, JWT secrets and third-party webhook credentials are intentionally omitted from diagnostic responses to guarantee compliance and security integrity.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Discard Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-[#E5EAF1]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-[#FEF2F2] flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[#172033]">
                  Discard Unsaved Changes?
                </h3>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Any modified fields in the current tab will revert to their saved values.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded-md text-[13px] font-medium text-[#64748B] hover:bg-[#F1F5F9] transition"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleResetActiveTab}
                className="px-3.5 py-1.5 rounded-md text-[13px] font-medium bg-[#DC2626] text-white hover:bg-[#B91C1C] transition"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
