export enum Role {
  ADMIN = "ADMIN",
  STAFF = "STAFF",
  CUSTOMER = "CUSTOMER",
}

export enum ProductType {
  GOODS = "GOODS",
  SERVICE = "SERVICE",
}

export enum PriceAdjustmentType {
  SURCHARGE = "SURCHARGE",
  DISCOUNT = "DISCOUNT",
}

export enum BillingInterval {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export enum QuotationStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export enum SubscriptionStatus {
  TRIALING = "TRIALING",
  ACTIVE = "ACTIVE",
  PAST_DUE = "PAST_DUE",
  PAUSED = "PAUSED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED_AMOUNT = "FIXED_AMOUNT",
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  ISSUED = "ISSUED",
  PAID = "PAID",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  OVERDUE = "OVERDUE",
  VOID = "VOID",
  CANCELLED = "CANCELLED",
}

export enum PaymentMethod {
  CARD = "CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
  UPI = "UPI",
  CASH = "CASH",
  OTHER = "OTHER",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum BillingRunStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum BillingAttemptStatus {
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
}

export enum SettingsCategory {
  GENERAL = "general",
  COMPANY = "company",
  BILLING = "billing",
  INVOICES = "invoices",
  SUBSCRIPTIONS = "subscriptions",
  NOTIFICATIONS = "notifications",
  SECURITY = "security",
  REGIONAL = "regional",
  SYSTEM = "system",
}

