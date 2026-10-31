import { prisma } from "../database/prisma";
import { DiscountType } from "@sms/shared";

export interface DiscountValidationResult {
  valid: boolean;
  reason?: string;
  discount?: any;
  amountDeductedMinor: bigint;
}

export class DiscountCalculationService {
  /**
   * Validates a discount code and calculates the discount amount.
   */
  static async validateAndCalculateDiscount(
    code: string,
    params: {
      customerId?: string;
      productIds?: string[];
      subtotalMinor?: bigint;
    } = {}
  ): Promise<DiscountValidationResult> {
    const discount = await prisma.discount.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        discountProducts: true,
      },
    });

    if (!discount) {
      return {
        valid: false,
        reason: `Discount code '${code}' does not exist`,
        amountDeductedMinor: 0n,
      };
    }

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

    // Product eligibility check: if discount specifies eligible products,
    // at least one of the passed productIds must be eligible.
    if (discount.discountProducts.length > 0 && params.productIds && params.productIds.length > 0) {
      const eligibleProductIds = new Set(discount.discountProducts.map((dp) => dp.productId));
      const hasEligibleProduct = params.productIds.some((pId) => eligibleProductIds.has(pId));

      if (!hasEligibleProduct) {
        return {
          valid: false,
          reason: `Discount code '${code}' is not applicable to any of the selected items`,
          amountDeductedMinor: 0n,
        };
      }
    }

    // Calculate discount amount in paise
    let amountDeductedMinor = 0n;
    const subtotal = params.subtotalMinor || 0n;

    if (subtotal > 0n) {
      if (discount.discountType === DiscountType.PERCENTAGE) {
        // valueMinorOrBasisPoints is basis points, e.g. 2000 for 20%
        // deduction = (subtotal * rateBasisPoints + 5000) / 10000
        const rateBps = discount.valueMinorOrBasisPoints;
        amountDeductedMinor = (subtotal * rateBps + 5000n) / 10000n;
      } else {
        // FIXED_AMOUNT: valueMinorOrBasisPoints is amount in paise
        amountDeductedMinor = discount.valueMinorOrBasisPoints;
      }

      // Discount cannot exceed subtotal (never make payable negative)
      if (amountDeductedMinor > subtotal) {
        amountDeductedMinor = subtotal;
      }
    }

    return {
      valid: true,
      discount,
      amountDeductedMinor,
    };
  }

  /**
   * Record discount redemption on an invoice or quotation inside a transaction.
   */
  static async recordDiscountRedemption(
    tx: any,
    discountId: string,
    amountDeductedMinor: bigint,
    links: { invoiceId?: string; quotationId?: string; subscriptionId?: string }
  ) {
    // Increment redemptions counter
    await tx.discount.update({
      where: { id: discountId },
      data: {
        currentRedemptions: {
          increment: 1,
        },
      },
    });

    // Create discount application record
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
