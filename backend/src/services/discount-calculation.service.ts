import { prisma } from "../database/prisma";
import { DiscountType, InvoiceStatus } from "@sms/shared";
import { parseDiscountMetadata } from "./discount.service";
import { BusinessRuleError } from "../utils/errors";

export interface DiscountValidationItem {
  productId: string;
  productVariantId?: string | null;
  quantity: string | number;
  unitPriceMinor?: string | bigint;
}

export interface DiscountValidationParams {
  customerId?: string;
  subscriptionId?: string;
  productIds?: string[];
  items?: DiscountValidationItem[];
  subtotalMinor?: bigint;
}

export interface DiscountValidationResult {
  valid: boolean;
  reason?: string;
  discount?: any;
  amountDeductedMinor: bigint;
  eligibleItemIds?: string[];
}

export class DiscountCalculationService {
  /**
   * Validates a discount code and calculates the discount amount adhering to:
   * 1. Active status & validity dates
   * 2. Global max redemptions
   * 3. Per-customer max redemptions
   * 4. Recurring billing cycle limits (e.g. valid for first 3 cycles, stops on cycle 4)
   * 5. Minimum quantity requirement (evaluating eligible items only for product-specific discounts)
   * 6. Minimum purchase amount requirement
   * 7. Maximum discount cap
   * 8. Scope: PRODUCT vs PLAN vs SUBSCRIPTION
   */
  static async validateAndCalculateDiscount(
    code: string,
    params: DiscountValidationParams = {}
  ): Promise<DiscountValidationResult> {
    const rawDiscount = await prisma.discount.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        discountProducts: true,
      },
    });

    if (!rawDiscount) {
      return {
        valid: false,
        reason: `Discount code '${code}' does not exist`,
        amountDeductedMinor: 0n,
      };
    }

    // Parse metadata
    const parsedMeta = parseDiscountMetadata(rawDiscount.name);
    const discount = {
      ...rawDiscount,
      name: parsedMeta.name,
      scope: parsedMeta.scope,
      minQuantity: parsedMeta.minQuantity,
      minOrderAmountMinor: parsedMeta.minOrderAmountMinor,
      maxDiscountAmountMinor: parsedMeta.maxDiscountAmountMinor,
      recurringCycleCount: parsedMeta.recurringCycleCount,
      maxRedemptionsPerCustomer: parsedMeta.maxRedemptionsPerCustomer,
    };

    if (!discount.isActive) {
      return {
        valid: false,
        reason: `Discount code '${code}' is currently inactive`,
        amountDeductedMinor: 0n,
      };
    }

    const now = new Date();
    if (discount.startDate && now < discount.startDate) {
      return {
        valid: false,
        reason: `Discount code '${code}' is not yet active`,
        amountDeductedMinor: 0n,
      };
    }

    if (discount.endDate && now > discount.endDate) {
      return {
        valid: false,
        reason: `Discount code '${code}' has expired`,
        amountDeductedMinor: 0n,
      };
    }

    // 1. Global redemption limit
    if (
      discount.maxRedemptions !== null &&
      discount.currentRedemptions >= discount.maxRedemptions
    ) {
      return {
        valid: false,
        reason: `Discount code '${code}' has reached its maximum redemptions limit`,
        amountDeductedMinor: 0n,
      };
    }

    // 2. Per-customer redemption limit
    if (params.customerId && discount.maxRedemptionsPerCustomer) {
      const customerRedemptions = await prisma.discountApplication.count({
        where: {
          discountId: discount.id,
          invoice: {
            customerId: params.customerId,
            status: { notIn: [InvoiceStatus.VOID, InvoiceStatus.CANCELLED] },
          },
        },
      });

      if (customerRedemptions >= discount.maxRedemptionsPerCustomer) {
        return {
          valid: false,
          reason: `Maximum customer redemption limit of ${discount.maxRedemptionsPerCustomer} reached for discount '${code}'`,
          amountDeductedMinor: 0n,
        };
      }
    }

    // 3. Recurring billing cycle limits (for subscriptions)
    if (params.subscriptionId && discount.recurringCycleCount) {
      const completedCycles = await prisma.discountApplication.count({
        where: {
          subscriptionId: params.subscriptionId,
          discountId: discount.id,
          invoiceId: { not: null },
          invoice: {
            status: { notIn: [InvoiceStatus.VOID, InvoiceStatus.CANCELLED] },
          },
        },
      });

      if (completedCycles >= discount.recurringCycleCount) {
        return {
          valid: false,
          reason: `Recurring discount '${code}' has completed its allowed duration of ${discount.recurringCycleCount} billing cycles`,
          amountDeductedMinor: 0n,
        };
      }
    }

    // 4. Product eligibility and minimum quantity calculation
    const hasDiscountProducts = discount.discountProducts.length > 0;
    const isProductScope = discount.scope === "PRODUCT" || hasDiscountProducts;
    const eligibleProductIds = new Set(discount.discountProducts.map((dp) => dp.productId));

    let amountDeductedMinor = 0n;
    const subtotal = params.subtotalMinor || 0n;
    const eligibleItemIds: string[] = [];

    if (params.items && params.items.length > 0) {
      if (isProductScope && hasDiscountProducts) {
        // Filter items that match eligible products
        const eligibleItems = params.items.filter((it) => eligibleProductIds.has(it.productId));

        if (eligibleItems.length === 0) {
          return {
            valid: false,
            reason: `Discount code '${code}' is not applicable to any of the selected products`,
            amountDeductedMinor: 0n,
          };
        }

        eligibleItems.forEach((it) => eligibleItemIds.push(it.productId));

        // Minimum quantity check — calculated ONLY on eligible products
        const eligibleQuantity = eligibleItems.reduce(
          (sum, it) => sum + Number(it.quantity || 1),
          0
        );

        if (discount.minQuantity && eligibleQuantity < discount.minQuantity) {
          return {
            valid: false,
            reason: `Minimum quantity of ${discount.minQuantity} eligible items required for discount '${code}' (purchased: ${eligibleQuantity})`,
            amountDeductedMinor: 0n,
          };
        }

        // Calculate eligible subtotal
        const eligibleSubtotal = eligibleItems.reduce((sum, it) => {
          const unitPrice = BigInt(it.unitPriceMinor || 0);
          const qtyScaled = BigInt(Math.round(Number(it.quantity || 1) * 1000));
          return sum + (unitPrice * qtyScaled) / 1000n;
        }, 0n);

        // Minimum purchase amount on eligible items
        if (
          discount.minOrderAmountMinor &&
          eligibleSubtotal < BigInt(discount.minOrderAmountMinor)
        ) {
          return {
            valid: false,
            reason: `Minimum purchase amount requirement of ₹${(
              Number(discount.minOrderAmountMinor) / 100
            ).toLocaleString("en-IN")} for eligible items not satisfied`,
            amountDeductedMinor: 0n,
          };
        }

        // Apply discount amount on eligible subtotal
        if (discount.discountType === DiscountType.PERCENTAGE) {
          const rateBps = discount.valueMinorOrBasisPoints;
          amountDeductedMinor = (eligibleSubtotal * rateBps + 5000n) / 10000n;
        } else {
          amountDeductedMinor = discount.valueMinorOrBasisPoints;
        }

        if (amountDeductedMinor > eligibleSubtotal) {
          amountDeductedMinor = eligibleSubtotal;
        }
      } else {
        // Subscription-wide or general scope
        const totalQuantity = params.items.reduce(
          (sum, it) => sum + Number(it.quantity || 1),
          0
        );

        if (discount.minQuantity && totalQuantity < discount.minQuantity) {
          return {
            valid: false,
            reason: `Minimum order quantity of ${discount.minQuantity} items required for discount '${code}' (purchased: ${totalQuantity})`,
            amountDeductedMinor: 0n,
          };
        }

        if (discount.minOrderAmountMinor && subtotal < BigInt(discount.minOrderAmountMinor)) {
          return {
            valid: false,
            reason: `Minimum invoice amount of ₹${(
              Number(discount.minOrderAmountMinor) / 100
            ).toLocaleString("en-IN")} not reached`,
            amountDeductedMinor: 0n,
          };
        }

        if (discount.discountType === DiscountType.PERCENTAGE) {
          const rateBps = discount.valueMinorOrBasisPoints;
          amountDeductedMinor = (subtotal * rateBps + 5000n) / 10000n;
        } else {
          amountDeductedMinor = discount.valueMinorOrBasisPoints;
        }

        if (amountDeductedMinor > subtotal) {
          amountDeductedMinor = subtotal;
        }
      }
    } else {
      // Fallback when only productIds or subtotalMinor passed
      if (hasDiscountProducts && params.productIds && params.productIds.length > 0) {
        const hasEligible = params.productIds.some((pId) => eligibleProductIds.has(pId));
        if (!hasEligible) {
          return {
            valid: false,
            reason: `Discount code '${code}' is not applicable to any of the selected items`,
            amountDeductedMinor: 0n,
          };
        }
      }

      if (discount.minOrderAmountMinor && subtotal < BigInt(discount.minOrderAmountMinor)) {
        return {
          valid: false,
          reason: `Minimum invoice amount of ₹${(
            Number(discount.minOrderAmountMinor) / 100
          ).toLocaleString("en-IN")} not reached`,
          amountDeductedMinor: 0n,
        };
      }

      if (subtotal > 0n) {
        if (discount.discountType === DiscountType.PERCENTAGE) {
          const rateBps = discount.valueMinorOrBasisPoints;
          amountDeductedMinor = (subtotal * rateBps + 5000n) / 10000n;
        } else {
          amountDeductedMinor = discount.valueMinorOrBasisPoints;
        }

        if (amountDeductedMinor > subtotal) {
          amountDeductedMinor = subtotal;
        }
      }
    }

    // 5. Maximum discount cap
    if (
      discount.maxDiscountAmountMinor &&
      amountDeductedMinor > BigInt(discount.maxDiscountAmountMinor)
    ) {
      amountDeductedMinor = BigInt(discount.maxDiscountAmountMinor);
    }

    // Clamping: payable can never be negative
    if (amountDeductedMinor > subtotal && subtotal > 0n) {
      amountDeductedMinor = subtotal;
    }

    return {
      valid: true,
      discount,
      amountDeductedMinor,
      eligibleItemIds,
    };
  }

  /**
   * Record discount redemption transactionally, with atomic conditional limit protections.
   * Concurrency-safe: Prevents race conditions during concurrent billing/invoice generation.
   */
  static async recordDiscountRedemption(
    tx: any,
    discountId: string,
    amountDeductedMinor: bigint,
    links: { invoiceId?: string; quotationId?: string; subscriptionId?: string }
  ) {
    // 1. Prevent duplicate application on the same invoice
    if (links.invoiceId) {
      const existingOnInvoice = await tx.discountApplication.findFirst({
        where: {
          invoiceId: links.invoiceId,
          discountId,
        },
      });
      if (existingOnInvoice) {
        throw new BusinessRuleError("Discount is already applied to this invoice");
      }
    }

    // 2. Fetch current status & limits
    const current = await tx.discount.findUnique({
      where: { id: discountId },
      select: { currentRedemptions: true, maxRedemptions: true, code: true },
    });

    if (!current) {
      throw new BusinessRuleError(`Discount with ID ${discountId} not found`);
    }

    // 3. Concurrency-safe atomic conditional update
    if (current.maxRedemptions !== null) {
      const updateResult = await tx.discount.updateMany({
        where: {
          id: discountId,
          currentRedemptions: { lt: current.maxRedemptions },
        },
        data: {
          currentRedemptions: {
            increment: 1,
          },
        },
      });

      if (updateResult.count === 0) {
        throw new BusinessRuleError(
          `Discount '${current.code}' has reached its maximum redemptions limit`
        );
      }
    } else {
      await tx.discount.update({
        where: { id: discountId },
        data: {
          currentRedemptions: {
            increment: 1,
          },
        },
      });
    }

    // 4. Create discount application record
    return tx.discountApplication.create({
      data: {
        discountId,
        amountDeductedMinor,
        invoiceId: links.invoiceId,
        quotationId: links.quotationId,
        subscriptionId: links.subscriptionId,
      },
    });
  }
}
