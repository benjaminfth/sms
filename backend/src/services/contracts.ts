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
