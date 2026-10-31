import { z } from "zod";
import {
  Role,
  ProductType,
  PriceAdjustmentType,
  BillingInterval,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  DiscountType,
} from "../enums";
import { PASSWORD_MIN_LENGTH, DEFAULT_CURRENCY } from "../constants";

// Password policy: >=9 chars, uppercase, lowercase, special characters (excluding spaces)
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must contain at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[^A-Za-z0-9\s]/, "Password must contain at least one special character");

export interface PasswordRequirements {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

export function checkPasswordRequirements(password: string): PasswordRequirements {
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9\s]/.test(password);

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasSpecialChar,
    isValid: hasMinLength && hasUppercase && hasLowercase && hasSpecialChar,
  };
}

// Auth schemas
export const registerSchema = z
  .object({
    email: z.string().email().transform((v) => v.toLowerCase().trim()),
    password: passwordSchema,
    confirmPassword: z.string().optional(),
    fullName: z.string().min(2, "Full name must be at least 2 characters").trim(),
    phone: z.string().optional().nullable(),
    companyName: z.string().optional().nullable(),
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.confirmPassword || data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Staff schemas
export const createStaffSchema = z
  .object({
    email: z.string().email().transform((v) => v.toLowerCase().trim()),
    password: passwordSchema,
    confirmPassword: z.string().optional(),
    fullName: z.string().min(2, "Full name must be at least 2 characters").trim(),
    phone: z.string().optional().nullable(),
    role: z.enum([Role.STAFF, Role.ADMIN]).default(Role.STAFF),
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const updateUserRoleSchema = z.object({
  role: z.enum([Role.ADMIN, Role.STAFF, Role.CUSTOMER]),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Customer schemas
export const createCustomerSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  fullName: z.string().min(2).trim(),
  companyName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  billingAddressLine1: z.string().optional().nullable(),
  billingAddressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().default("India"),
  currency: z.string().default(DEFAULT_CURRENCY),
  gstOrTaxId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateCustomerSchema = z.object({
  fullName: z.string().min(2).optional(),
  companyName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  billingAddressLine1: z.string().optional().nullable(),
  billingAddressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional(),
  currency: z.string().optional(),
  gstOrTaxId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// String representation for minor amounts in requests (accepts string or number, converts to string)
export const minorAmountSchema = z
  .union([z.string(), z.number(), z.bigint()])
  .transform((val) => String(val).trim())
  .refine((val) => /^\d+$/.test(val), {
    message: "Amount must be a non-negative integer string in minor units",
  });

// Product schemas
export const createProductVariantSchema = z.object({
  sku: z.string().min(2).trim(),
  name: z.string().min(2).trim(),
  brand: z.string().optional().nullable(),
  attribute: z.string().optional().nullable(),
  priceAdjustmentType: z.nativeEnum(PriceAdjustmentType).default(PriceAdjustmentType.SURCHARGE),
  priceAdjustmentMinor: minorAmountSchema.default("0"),
  isActive: z.boolean().default(true),
});

export const updateProductVariantSchema = z.object({
  name: z.string().min(2).optional(),
  sku: z.string().min(2).optional(),
  brand: z.string().optional().nullable(),
  attribute: z.string().optional().nullable(),
  priceAdjustmentType: z.nativeEnum(PriceAdjustmentType).optional(),
  priceAdjustmentMinor: minorAmountSchema.optional(),
  isActive: z.boolean().optional(),
});

export const createProductSchema = z.object({
  sku: z.string().min(2).trim(),
  name: z.string().min(2).trim(),
  description: z.string().optional().nullable(),
  productType: z.nativeEnum(ProductType).default(ProductType.SERVICE),
  baseSellingPriceMinor: minorAmountSchema,
  costPriceMinor: minorAmountSchema.default("0"),
  currency: z.string().default(DEFAULT_CURRENCY),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  variants: z.array(createProductVariantSchema).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  sku: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  productType: z.nativeEnum(ProductType).optional(),
  baseSellingPriceMinor: minorAmountSchema.optional(),
  costPriceMinor: minorAmountSchema.optional(),
  currency: z.string().optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Plan schemas
export const planPriceInputSchema = z.object({
  currency: z.string().default(DEFAULT_CURRENCY),
  billingInterval: z.nativeEnum(BillingInterval).default(BillingInterval.MONTHLY),
  intervalCount: z.number().int().positive().default(1),
  amountMinor: minorAmountSchema,
  setupFeeMinor: minorAmountSchema.default("0"),
  isActive: z.boolean().default(true),
});

export const planItemInputSchema = z.object({
  productId: z.string().uuid("Product ID must be a valid UUID"),
  productVariantId: z.string().uuid("Variant ID must be a valid UUID").optional().nullable(),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => String(val))
    .default("1.000"),
});

export const createPlanSchema = z.object({
  code: z.string().min(2).trim(),
  name: z.string().min(2).trim(),
  description: z.string().optional().nullable(),
  minQuantity: z.number().int().positive().default(1),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  isActive: z.boolean().default(true),
  autoCloseOnEndDate: z.boolean().default(true),
  allowEarlyClosure: z.boolean().default(false),
  allowPause: z.boolean().default(true),
  allowRenewal: z.boolean().default(true),
  prices: z.array(planPriceInputSchema).min(1, "Plan must have at least one price configuration"),
  items: z.array(planItemInputSchema).optional().default([]),
});

export const updatePlanSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  minQuantity: z.number().int().positive().optional(),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  isActive: z.boolean().optional(),
  autoCloseOnEndDate: z.boolean().optional(),
  allowEarlyClosure: z.boolean().optional(),
  allowPause: z.boolean().optional(),
  allowRenewal: z.boolean().optional(),
});

// Pagination query schema
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================================
// DEVELOPER 3 SCHEMAS: TAXES, DISCOUNTS, PAYMENTS, ALLOCATIONS, PRICING
// ============================================================================

// Tax schemas
export const createTaxSchema = z.object({
  name: z.string().min(2, "Tax name must be at least 2 characters").trim(),
  code: z.string().min(2, "Tax code must be at least 2 characters").trim().toUpperCase(),
  rateBasisPoints: z.coerce
    .number()
    .int()
    .min(0, "Rate basis points cannot be negative")
    .max(10000, "Rate basis points cannot exceed 10,000 (100%)"),
  isActive: z.boolean().default(true),
});

export const updateTaxSchema = z.object({
  name: z.string().min(2).trim().optional(),
  code: z.string().min(2).trim().toUpperCase().optional(),
  rateBasisPoints: z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .optional(),
  isActive: z.boolean().optional(),
});

export const assignProductTaxesSchema = z.object({
  taxIds: z.array(z.string().uuid("Invalid Tax ID")),
});

// Discount schemas
export const createDiscountSchema = z.object({
  code: z.string().min(2, "Discount code must be at least 2 characters").trim().toUpperCase(),
  name: z.string().min(2, "Discount name must be at least 2 characters").trim(),
  discountType: z.nativeEnum(DiscountType).default(DiscountType.PERCENTAGE),
  valueMinorOrBasisPoints: minorAmountSchema,
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  maxRedemptions: z.coerce.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string().uuid("Invalid product ID")).optional(),
  scope: z.enum(["PRODUCT", "PLAN", "SUBSCRIPTION"]).default("SUBSCRIPTION").optional(),
  minQuantity: z.coerce.number().int().positive().optional().nullable(),
  minOrderAmountMinor: minorAmountSchema.optional().nullable(),
  maxDiscountAmountMinor: minorAmountSchema.optional().nullable(),
  recurringCycleCount: z.coerce.number().int().positive().optional().nullable(),
  maxRedemptionsPerCustomer: z.coerce.number().int().positive().optional().nullable(),
});

export const updateDiscountSchema = z.object({
  name: z.string().min(2).trim().optional(),
  discountType: z.nativeEnum(DiscountType).optional(),
  valueMinorOrBasisPoints: minorAmountSchema.optional(),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  maxRedemptions: z.coerce.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  productIds: z.array(z.string().uuid("Invalid product ID")).optional(),
  scope: z.enum(["PRODUCT", "PLAN", "SUBSCRIPTION"]).optional(),
  minQuantity: z.coerce.number().int().positive().optional().nullable(),
  minOrderAmountMinor: minorAmountSchema.optional().nullable(),
  maxDiscountAmountMinor: minorAmountSchema.optional().nullable(),
  recurringCycleCount: z.coerce.number().int().positive().optional().nullable(),
  maxRedemptionsPerCustomer: z.coerce.number().int().positive().optional().nullable(),
});

export const validateDiscountSchema = z.object({
  code: z.string().min(1, "Discount code is required").trim().toUpperCase(),
  customerId: z.string().uuid().optional().nullable(),
  subscriptionId: z.string().uuid().optional().nullable(),
  productIds: z.array(z.string().uuid()).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.union([z.string(), z.number()]).default(1),
        unitPriceMinor: minorAmountSchema.optional(),
      })
    )
    .optional(),
  subtotalMinor: minorAmountSchema.optional(),
});

export const attachSubscriptionDiscountSchema = z.object({
  subscriptionId: z.string().uuid("Invalid subscription ID"),
  discountCode: z.string().min(1, "Discount code is required").trim().toUpperCase(),
});

// Payment schemas
export const createPaymentSchema = z.object({
  customerId: z.string().uuid("Customer ID must be a valid UUID"),
  amountMinor: minorAmountSchema,
  currency: z.string().default(DEFAULT_CURRENCY),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CARD),
  status: z.nativeEnum(PaymentStatus).default(PaymentStatus.COMPLETED),
  notes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
  paymentReference: z.string().optional(),
  invoiceId: z.string().uuid().optional().nullable(),
  allocatedAmountMinor: minorAmountSchema.optional(),
});

export const createPaymentAllocationSchema = z.object({
  invoiceId: z.string().uuid("Invoice ID must be a valid UUID"),
  allocatedAmountMinor: minorAmountSchema,
});

export const reconcileAllocationsSchema = z.object({
  allocations: z
    .array(
      z.object({
        invoiceId: z.string().uuid("Invoice ID must be a valid UUID"),
        allocatedAmountMinor: minorAmountSchema,
      })
    )
    .min(1, "At least one allocation must be provided"),
});

// Pricing Engine schema
export const calculatePricingItemSchema = z.object({
  productId: z.string().uuid("Product ID must be a valid UUID"),
  productVariantId: z.string().uuid().optional().nullable(),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => String(val))
    .default("1.000"),
  unitPriceMinor: minorAmountSchema.optional(),
  description: z.string().optional(),
});

export const calculatePricingSchema = z.object({
  items: z.array(calculatePricingItemSchema).min(1, "At least one item is required for pricing"),
  discountCode: z.string().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  subscriptionId: z.string().uuid().optional().nullable(),
  currency: z.string().default(DEFAULT_CURRENCY),
  isInclusiveTax: z.boolean().default(false),
});

// Dashboard query schema
export const dashboardQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y", "custom"]).default("30d"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// DEVELOPER 2 SCHEMAS: QUOTATIONS, SUBSCRIPTIONS, INVOICES, BILLING
// ============================================================================

// Quotation Items & Quotations
export const createQuotationItemSchema = z.object({
  productId: z.string().uuid("Product ID must be a valid UUID"),
  productVariantId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => String(val))
    .default("1.000"),
  unitPriceMinor: minorAmountSchema.optional(),
});

// Payment terms schema
export const paymentTermsSchema = z
  .enum(["DUE_IMMEDIATELY", "NET_7", "NET_15", "NET_30"])
  .default("NET_15");

// Template Line schema
export const templateLineSchema = z.object({
  productId: z.string().uuid().optional(),
  productVariantId: z.string().uuid().optional().nullable(),
  planId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => String(val))
    .default("1.000"),
  unitPriceMinor: minorAmountSchema.optional().nullable(),
});

export const createQuotationSchema = z.object({
  customerId: z.string().uuid("Customer ID must be a valid UUID"),
  templateId: z.string().uuid().optional().nullable(),
  currency: z.string().default(DEFAULT_CURRENCY),
  validUntil: z.string().datetime({ offset: true }).optional(),
  paymentTerms: paymentTermsSchema.optional(),
  notes: z.string().optional().nullable(),
  discountCode: z.string().optional().nullable(),
  items: z.array(createQuotationItemSchema).optional().default([]),
});

export const updateQuotationSchema = z.object({
  templateId: z.string().uuid().optional().nullable(),
  validUntil: z.string().datetime({ offset: true }).optional(),
  paymentTerms: paymentTermsSchema.optional(),
  notes: z.string().optional().nullable(),
  discountCode: z.string().optional().nullable(),
  items: z.array(createQuotationItemSchema).optional(),
});

// Quotation Template schemas
export const createQuotationTemplateSchema = z.object({
  name: z.string().min(2, "Template name must be at least 2 characters").trim(),
  description: z.string().optional().nullable(),
  validityDays: z.number().int().positive().default(15),
  paymentTerms: paymentTermsSchema.optional(),
  termsAndConditions: z.string().optional().nullable(),
  planId: z.string().uuid().optional().nullable(),
  lines: z.array(templateLineSchema).optional(),
  isActive: z.boolean().default(true),
});

export const updateQuotationTemplateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  validityDays: z.number().int().positive().optional(),
  paymentTerms: paymentTermsSchema.optional(),
  termsAndConditions: z.string().optional().nullable(),
  planId: z.string().uuid().optional().nullable(),
  lines: z.array(templateLineSchema).optional(),
  isActive: z.boolean().optional(),
});

// Subscription Items & Subscriptions
export const createSubscriptionItemSchema = z.object({
  productId: z.string().uuid("Product ID must be a valid UUID"),
  productVariantId: z.string().uuid().optional().nullable(),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => String(val))
    .default("1.000"),
  unitPriceMinor: minorAmountSchema.optional(),
});

export const createSubscriptionSchema = z.object({
  quotationId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional(),
  planId: z.string().uuid().optional().nullable(),
  stage: z.enum(["DRAFT", "ACTIVE"]).default("ACTIVE"),
  billingInterval: z.nativeEnum(BillingInterval).default(BillingInterval.MONTHLY),
  intervalCount: z.number().int().positive().default(1),
  paymentTerms: paymentTermsSchema.optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  currency: z.string().default(DEFAULT_CURRENCY),
  items: z.array(createSubscriptionItemSchema).optional(),
});

export const updateSubscriptionSchema = z.object({
  billingInterval: z.nativeEnum(BillingInterval).optional(),
  intervalCount: z.number().int().positive().optional(),
  paymentTerms: paymentTermsSchema.optional(),
});

export const cancelSubscriptionSchema = z.object({
  cancellationReason: z.string().optional().nullable(),
  effectiveImmediately: z.boolean().default(true),
});

export const pauseSubscriptionSchema = z.object({
  reason: z.string().optional().nullable(),
});

export const renewSubscriptionSchema = z.object({
  renewalDurationMonths: z.number().int().positive().default(12),
  notes: z.string().optional().nullable(),
});

export const closeSubscriptionSchema = z.object({
  reason: z.string().optional().nullable(),
});

export const confirmSubscriptionSchema = z.object({
  notes: z.string().optional().nullable(),
});

export const sendSubscriptionQuotationSchema = z.object({
  notes: z.string().optional().nullable(),
});

// Billing schemas
export const triggerBillingRunSchema = z.object({
  targetDate: z.string().datetime({ offset: true }).optional(),
  batchSize: z.number().int().min(1).max(500).default(50),
  retryFailedOnly: z.boolean().default(false),
  maxRetries: z.number().int().min(1).max(5).default(3),
  autoCloseExpired: z.boolean().default(true),
});

// Invoice schemas
export const createInvoiceItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => String(val))
    .default("1.000"),
  unitPriceMinor: minorAmountSchema,
  taxAmountMinor: minorAmountSchema.default("0"),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid("Customer ID must be a valid UUID"),
  subscriptionId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  currency: z.string().default(DEFAULT_CURRENCY),
  paymentTerms: paymentTermsSchema.optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  billingPeriodStart: z.string().datetime({ offset: true }).optional().nullable(),
  billingPeriodEnd: z.string().datetime({ offset: true }).optional().nullable(),
  items: z.array(createInvoiceItemSchema).min(1, "Invoice must have at least one line item"),
});

export const confirmInvoiceSchema = z.object({
  paymentTerms: paymentTermsSchema.optional(),
});

export const sendInvoiceSchema = z.object({
  recipientEmail: z.string().email().optional(),
  notes: z.string().optional().nullable(),
});

export const voidInvoiceSchema = z.object({
  reason: z.string().optional().nullable(),
});
