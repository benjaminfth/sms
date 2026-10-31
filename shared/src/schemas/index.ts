import { z } from "zod";
import { Role, ProductType, PriceAdjustmentType, BillingInterval } from "../enums";
import { PASSWORD_MIN_LENGTH, DEFAULT_CURRENCY } from "../constants";

// Password policy: >=9 chars, uppercase, lowercase, special characters
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must contain at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: passwordSchema,
  fullName: z.string().min(2, "Full name must be at least 2 characters").trim(),
  phone: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});

// Staff schemas
export const createStaffSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: passwordSchema,
  fullName: z.string().min(2, "Full name must be at least 2 characters").trim(),
  phone: z.string().optional().nullable(),
  role: z.enum([Role.STAFF, Role.ADMIN]).default(Role.STAFF),
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
  .transform((val) => {
    const str = String(val).trim();
    if (!/^\d+$/.test(str)) {
      throw new Error("Amount must be a non-negative integer string in minor units");
    }
    return str;
  });

// Product schemas
export const createProductVariantSchema = z.object({
  sku: z.string().min(2).trim(),
  name: z.string().min(2).trim(),
  priceAdjustmentType: z.nativeEnum(PriceAdjustmentType).default(PriceAdjustmentType.SURCHARGE),
  priceAdjustmentMinor: minorAmountSchema.default("0"),
  isActive: z.boolean().default(true),
});

export const updateProductVariantSchema = z.object({
  name: z.string().min(2).optional(),
  sku: z.string().min(2).optional(),
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
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  isActive: z.boolean().default(true),
  prices: z.array(planPriceInputSchema).min(1, "Plan must have at least one price configuration"),
  items: z.array(planItemInputSchema).optional().default([]),
});

export const updatePlanSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  isActive: z.boolean().optional(),
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

export const createQuotationSchema = z.object({
  customerId: z.string().uuid("Customer ID must be a valid UUID"),
  templateId: z.string().uuid().optional().nullable(),
  currency: z.string().default(DEFAULT_CURRENCY),
  validUntil: z.string().datetime({ offset: true }),
  notes: z.string().optional().nullable(),
  discountCode: z.string().optional().nullable(),
  items: z.array(createQuotationItemSchema).min(1, "Quotation must have at least one item"),
});

export const updateQuotationSchema = z.object({
  templateId: z.string().uuid().optional().nullable(),
  validUntil: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional().nullable(),
  discountCode: z.string().optional().nullable(),
  items: z.array(createQuotationItemSchema).optional(),
});

// Quotation Template schemas
export const createQuotationTemplateSchema = z.object({
  name: z.string().min(2, "Template name must be at least 2 characters").trim(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateQuotationTemplateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
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
  billingInterval: z.nativeEnum(BillingInterval).default(BillingInterval.MONTHLY),
  intervalCount: z.number().int().positive().default(1),
  startDate: z.string().datetime({ offset: true }).optional(),
  currency: z.string().default(DEFAULT_CURRENCY),
  items: z.array(createSubscriptionItemSchema).optional(),
});

export const updateSubscriptionSchema = z.object({
  billingInterval: z.nativeEnum(BillingInterval).optional(),
  intervalCount: z.number().int().positive().optional(),
});

export const cancelSubscriptionSchema = z.object({
  cancellationReason: z.string().optional().nullable(),
  effectiveImmediately: z.boolean().default(true),
});

export const pauseSubscriptionSchema = z.object({
  reason: z.string().optional().nullable(),
});

// Billing schemas
export const triggerBillingRunSchema = z.object({
  targetDate: z.string().datetime({ offset: true }).optional(),
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
  currency: z.string().default(DEFAULT_CURRENCY),
  dueDate: z.string().datetime({ offset: true }),
  billingPeriodStart: z.string().datetime({ offset: true }).optional().nullable(),
  billingPeriodEnd: z.string().datetime({ offset: true }).optional().nullable(),
  items: z.array(createInvoiceItemSchema).min(1, "Invoice must have at least one line item"),
});

export const voidInvoiceSchema = z.object({
  reason: z.string().optional().nullable(),
});
