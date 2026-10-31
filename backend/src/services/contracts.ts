/**
 * ============================================================================
 * BRIGHTLOOP SUBSCRIPTION MANAGEMENT SYSTEM — PLATFORM INTEGRATION CONTRACTS
 * ============================================================================
 * Developer 1 (Platform Lead) exports these standardized contracts for
 * Developer 2 (Quotations, Subscriptions, Invoices) and
 * Developer 3 (Tax, Discounts, Payments, Portal).
 */

import { CustomerService } from "./customer.service";
import { ProductService } from "./product.service";
import { PlanService } from "./plan.service";
import { createAuditLog as auditLogService } from "./audit.service";
import { prisma as sharedPrisma } from "../database/prisma";

// Contract A: Customer Lookup
export const getCustomerById = CustomerService.getCustomerById;
export const getCustomerByUserId = CustomerService.getCustomerByUserId;

// Contract B: Product Pricing & Variant Surcharge Resolution
export const getProductWithVariant = ProductService.getProductWithVariant;

// Contract C: Plan & Price Resolution
export const getActivePlanWithPrice = PlanService.getActivePlanWithPrice;

// Contract D: Audit Logging
export const createAuditLog = auditLogService;

// Contract E: Shared Prisma Client Singleton
export const prisma = sharedPrisma;

// ============================================================================
// DEVELOPER 3 INTEGRATION CONTRACTS (Financial Engine & Payment Processing)
// ============================================================================

import { TaxCalculationService } from "./tax-calculation.service";
import { DiscountCalculationService } from "./discount-calculation.service";
import { PricingService } from "./pricing.service";
import { InvoiceSettlementService } from "./invoice-settlement.service";
import { PaymentService } from "./payment.service";
import { AllocationService } from "./allocation.service";

// Contract F: Tax Calculation Engine (Exclusive/Inclusive & Product Taxes)
export const calculateExclusiveTax = TaxCalculationService.calculateExclusiveTax;
export const calculateInclusiveTax = TaxCalculationService.calculateInclusiveTax;
export const calculateItemTaxes = TaxCalculationService.calculateItemTaxes;
export const getActiveTaxesForProduct = TaxCalculationService.getActiveTaxesForProduct;

// Contract G: Discount Validation & Calculation
export const validateAndCalculateDiscount = DiscountCalculationService.validateAndCalculateDiscount;
export const recordDiscountRedemption = DiscountCalculationService.recordDiscountRedemption;

// Contract H: Unified Pricing Engine (For Quotations, Subscriptions & Invoices)
export const calculatePricing = PricingService.calculatePricing;

// Contract I: Invoice Settlement & Balance Updates (Transactional)
export const updateInvoiceSettlement = InvoiceSettlementService.updateInvoiceSettlement;

// Contract J: Payment Processing & Allocations
export const recordPayment = PaymentService.recordPayment;
export const allocatePayment = AllocationService.allocatePayment;

