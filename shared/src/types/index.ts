import {
  Role,
  ProductType,
  PriceAdjustmentType,
  BillingInterval,
  QuotationStatus,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  DiscountType,
  BillingRunStatus,
  BillingAttemptStatus,
} from "../enums";

export interface MoneyDTO {
  currency: string;
  amountMinor: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface APIErrorDetail {
  field?: string;
  message: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: APIErrorDetail[] | unknown;
}

export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  meta: PaginationMeta | null;
  error: APIError | null;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  data: T[];
  meta: PaginationMeta;
}

// User DTOs
export interface UserDTO {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionDTO {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
  };
}

// Customer DTO
export interface CustomerDTO {
  id: string;
  userId?: string | null;
  email: string;
  fullName: string;
  companyName?: string | null;
  phone?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  currency: string;
  gstOrTaxId?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: UserDTO | null;
}

// Product Variant DTO
export interface ProductVariantDTO {
  id: string;
  productId: string;
  sku: string;
  name: string;
  brand?: string | null;
  attribute?: string | null;
  priceAdjustmentType: PriceAdjustmentType;
  priceAdjustmentMinor: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product DTO
export interface ProductDTO {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  productType: ProductType;
  baseSellingPriceMinor: string;
  costPriceMinor: string;
  currency: string;
  notes?: string | null;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  variants?: ProductVariantDTO[];
}

// Plan Price DTO
export interface PlanPriceDTO {
  id: string;
  planId: string;
  currency: string;
  billingInterval: BillingInterval;
  intervalCount: number;
  amountMinor: string;
  setupFeeMinor: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Plan Item DTO
export interface PlanItemDTO {
  id: string;
  planId: string;
  productId: string;
  productVariantId?: string | null;
  quantity: string;
  product?: ProductDTO;
  productVariant?: ProductVariantDTO | null;
  createdAt: string;
  updatedAt: string;
}

// Plan DTO
export interface PlanDTO {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  minQuantity: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  autoCloseOnEndDate: boolean;
  allowEarlyClosure: boolean;
  allowPause: boolean;
  allowRenewal: boolean;
  createdAt: string;
  updatedAt: string;
  prices: PlanPriceDTO[];
  items: PlanItemDTO[];
}

// Audit Log Input Contract
export interface CreateAuditLogInput {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Product Pricing Contract Result
export interface ProductPricingResult {
  product: ProductDTO;
  variant?: ProductVariantDTO | null;
  finalPriceMinor: string;
  currency: string;
}

// Payment Terms
export type PaymentTerms = "DUE_IMMEDIATELY" | "NET_7" | "NET_15" | "NET_30";

// Preconfigured Line in Quotation Template
export interface TemplateLineConfig {
  productId?: string;
  productVariantId?: string | null;
  planId?: string | null;
  description?: string | null;
  quantity: string;
  unitPriceMinor?: string | null;
}

// Quotation Template Configuration Metadata
export interface QuotationTemplateConfig {
  validityDays?: number;
  paymentTerms?: PaymentTerms;
  termsAndConditions?: string;
  planId?: string | null;
  lines?: TemplateLineConfig[];
}

// Quotation Template DTO
export interface QuotationTemplateDTO {
  id: string;
  name: string;
  description?: string | null;
  config?: QuotationTemplateConfig;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Quotation Item DTO
export interface QuotationItemDTO {
  id: string;
  quotationId: string;
  productId: string;
  productVariantId?: string | null;
  description?: string | null;
  quantity: string;
  unitPriceMinor: string;
  totalAmountMinor: string;
  createdAt: string;
  product?: ProductDTO;
  productVariant?: ProductVariantDTO | null;
}

// Quotation DTO
export interface QuotationDTO {
  id: string;
  quotationNumber: string;
  customerId: string;
  templateId?: string | null;
  status: QuotationStatus;
  totalAmountMinor: string;
  currency: string;
  validUntil: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationWithDetailsDTO extends QuotationDTO {
  customer: CustomerDTO;
  template?: QuotationTemplateDTO | null;
  items: QuotationItemDTO[];
  subscription?: SubscriptionDTO | null;
}

// Subscription Item DTO
export interface SubscriptionItemDTO {
  id: string;
  subscriptionId: string;
  productId: string;
  productVariantId?: string | null;
  quantity: string;
  unitPriceMinor: string;
  createdAt: string;
  updatedAt: string;
  product?: ProductDTO;
  productVariant?: ProductVariantDTO | null;
}

// Subscription Business Lifecycle Status (Challenge Alignment)
export type SubscriptionBusinessStatus =
  | "DRAFT"
  | "QUOTATION"
  | "CONFIRMED"
  | "ACTIVE"
  | "PAUSED"
  | "CLOSED";

// Plan Lifecycle Policy
export interface PlanLifecyclePolicy {
  allowPause?: boolean;
  allowEarlyClosure?: boolean;
  allowRenewal?: boolean;
  autoCloseAtEnd?: boolean;
  defaultPaymentTerms?: PaymentTerms;
}

// Subscription DTO
export interface SubscriptionDTO {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  planId?: string | null;
  quotationId?: string | null;
  status: SubscriptionStatus;
  businessStatus?: SubscriptionBusinessStatus;
  paymentTerms?: PaymentTerms;
  billingInterval: BillingInterval;
  intervalCount: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionWithDetailsDTO extends SubscriptionDTO {
  customer: CustomerDTO;
  plan?: PlanDTO | null;
  quotation?: QuotationDTO | null;
  items: SubscriptionItemDTO[];
  invoices?: InvoiceDTO[];
  lifecyclePolicy?: PlanLifecyclePolicy;
}

// Invoice Item DTO
export interface InvoiceItemDTO {
  id: string;
  invoiceId: string;
  productId?: string | null;
  description: string;
  quantity: string;
  unitPriceMinor: string;
  taxAmountMinor: string;
  totalAmountMinor: string;
  createdAt: string;
  product?: ProductDTO | null;
}

// Invoice DTO
export interface InvoiceDTO {
  id: string;
  invoiceNumber: string;
  subscriptionId?: string | null;
  customerId: string;
  status: InvoiceStatus;
  businessStatus?: string; // e.g. "OPEN (Confirmed)"
  paymentTerms?: PaymentTerms;
  currency: string;
  subtotalMinor: string;
  taxAmountMinor: string;
  discountAmountMinor: string;
  totalAmountMinor: string;
  amountPaidMinor: string;
  balanceDueMinor: string;
  dueDate: string;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  issuedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceWithDetailsDTO extends InvoiceDTO {
  customer: CustomerDTO;
  subscription?: SubscriptionDTO | null;
  items: InvoiceItemDTO[];
  paymentAllocations?: PaymentAllocationDTO[];
}

// Payment Allocation DTO
export interface PaymentAllocationDTO {
  id: string;
  paymentId: string;
  invoiceId: string;
  allocatedAmountMinor: string;
  createdAt: string;
  invoice?: InvoiceDTO;
  payment?: PaymentDTO;
}

// Payment DTO
export interface PaymentDTO {
  id: string;
  paymentReference: string;
  customerId: string;
  amountMinor: string;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  notes?: string | null;
  internalNotes?: string | null;
  customerNotes?: string | null;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
}

export type DiscountScope = "PRODUCT" | "PLAN" | "SUBSCRIPTION";

// Discount DTO
export interface DiscountDTO {
  id: string;
  code: string;
  name: string;
  discountType: DiscountType;
  valueMinorOrBasisPoints: string;
  startDate?: string | null;
  endDate?: string | null;
  maxRedemptions?: number | null;
  currentRedemptions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  discountProducts?: DiscountProductDTO[];
  scope?: DiscountScope;
  minQuantity?: number | null;
  minOrderAmountMinor?: string | null;
  maxDiscountAmountMinor?: string | null;
  recurringCycleCount?: number | null;
  maxRedemptionsPerCustomer?: number | null;
}

// Tax DTO
export interface TaxDTO {
  id: string;
  name: string;
  code: string;
  rateBasisPoints: number; // e.g. 1800 for 18.00%
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  productTaxes?: ProductTaxDTO[];
}

export interface ProductTaxDTO {
  id: string;
  productId: string;
  taxId: string;
  createdAt: string;
  product?: ProductDTO;
  tax?: TaxDTO;
}

export interface TaxComponentBreakdown {
  taxId?: string;
  taxCode: string;
  name: string;
  rateBps: number;
  amountMinor: string;
}

export interface DiscountProductDTO {
  id: string;
  discountId: string;
  productId: string;
  createdAt: string;
  product?: ProductDTO;
}

export interface DiscountApplicationDTO {
  id: string;
  discountId: string;
  quotationId?: string | null;
  subscriptionId?: string | null;
  invoiceId?: string | null;
  amountDeductedMinor: string;
  appliedAt: string;
  discount?: DiscountDTO;
}

export interface PaymentWithAllocationsDTO extends PaymentDTO {
  customer?: CustomerDTO;
  allocations: (PaymentAllocationDTO & {
    invoice?: InvoiceDTO;
  })[];
  unallocatedAmountMinor: string;
}

export interface ReconciliationRecordDTO {
  id: string;
  paymentReference: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  amountMinor: string;
  allocatedAmountMinor: string;
  unallocatedAmountMinor: string;
  isFullyAllocated: boolean;
  paidAt: string;
  allocations: {
    allocationId: string;
    invoiceId: string;
    invoiceNumber: string;
    allocatedAmountMinor: string;
  }[];
}

export interface PricingCalculationResult {
  currency: string;
  subtotalMinor: string;
  discountTotalMinor: string;
  taxableAmountMinor: string;
  taxTotalMinor: string;
  grandTotalMinor: string;
  items: {
    productId?: string | null;
    productVariantId?: string | null;
    description: string;
    quantity: string;
    unitPriceMinor: string;
    subtotalMinor: string;
    discountMinor: string;
    taxAmountMinor: string;
    totalAmountMinor: string;
    applicableTaxes: TaxComponentBreakdown[];
  }[];
  discountBreakdown: {
    discountId: string;
    code: string;
    name: string;
    discountType: DiscountType;
    amountMinor: string;
  }[];
  taxBreakdown: TaxComponentBreakdown[];
}

export interface DashboardOverviewDTO {
  totalCustomers: number;
  activeSubscriptions: number;
  newSubscriptionsCount: number;
  cancelledSubscriptionsCount: number;
  totalInvoicesCount: number;
  paidInvoicesCount: number;
  outstandingInvoicesCount: number;
  overdueInvoicesCount: number;
  totalCollectedRevenueMinor: string;
  totalInvoicedRevenueMinor: string;
  totalOutstandingRevenueMinor: string;
  currency: string;
}

export interface RevenueAnalyticsPoint {
  date: string;
  invoicedMinor: string;
  collectedMinor: string;
}

export interface RevenueAnalyticsDTO {
  currency: string;
  points: RevenueAnalyticsPoint[];
  totalInvoicedMinor: string;
  totalCollectedMinor: string;
}

export interface SubscriptionAnalyticsDTO {
  activeCount: number;
  trialingCount: number;
  pastDueCount: number;
  pausedCount: number;
  cancelledCount: number;
  expiredCount: number;
  byPlan: {
    planId: string;
    planName: string;
    count: number;
  }[];
}

export interface InvoiceAnalyticsDTO {
  statusDistribution: {
    status: InvoiceStatus;
    count: number;
    totalAmountMinor: string;
  }[];
}

export interface PaymentMethodAnalyticsDTO {
  methods: {
    method: PaymentMethod;
    count: number;
    totalAmountMinor: string;
  }[];
}

export interface CustomerPortalOverviewDTO {
  customer: CustomerDTO;
  activeSubscriptions: (SubscriptionDTO & { plan?: { name?: string } | null })[];
  upcomingBillingDate: string | null;
  recentInvoices: InvoiceDTO[];
  totalOutstandingBalanceMinor: string;
  recentPayments: PaymentDTO[];
}

// Billing Run & Attempt DTOs
export interface BillingRunDTO {
  id: string;
  runDate: string;
  status: BillingRunStatus;
  targetDate: string;
  processedSubscriptionsCount: number;
  successfulInvoicesCount: number;
  failedInvoicesCount: number;
  errorDetails?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingAttemptDTO {
  id: string;
  billingRunId: string;
  subscriptionId: string;
  status: BillingAttemptStatus;
  invoiceId?: string | null;
  errorMessage?: string | null;
  attemptedAt: string;
  subscription?: SubscriptionDTO;
  invoice?: InvoiceDTO | null;
}

// Developer 3 Pricing & Tax Contract Interfaces
export interface LineItemCalculationInput {
  productId?: string | null;
  productVariantId?: string | null;
  description: string;
  quantity: string | number;
  unitPriceMinor: string | bigint | number;
}

export interface CalculationInput {
  customerId: string;
  currency?: string;
  items: LineItemCalculationInput[];
  discountCode?: string | null;
  billingPeriodStart?: Date | null;
  billingPeriodEnd?: Date | null;
}

export interface LineItemCalculationResult {
  productId?: string | null;
  productVariantId?: string | null;
  description: string;
  quantity: string;
  unitPriceMinor: string;
  taxAmountMinor: string;
  totalAmountMinor: string;
}

export interface CalculationBreakdown {
  subtotalMinor: string;
  taxAmountMinor: string;
  discountAmountMinor: string;
  totalAmountMinor: string;
  items: LineItemCalculationResult[];
  appliedDiscountId?: string | null;
}
