import { prisma } from "../database/prisma";
import { DiscountType } from "@sms/shared";

export interface PricingLineItemInput {
  productId?: string | null;
  productVariantId?: string | null;
  description: string;
  quantity: string | number;
  unitPriceMinor: bigint | string | number;
}

export interface PricingCalculationInput {
  customerId: string;
  currency?: string;
  items: PricingLineItemInput[];
  discountCode?: string | null;
  billingPeriodStart?: Date | null;
  billingPeriodEnd?: Date | null;
}

export interface CalculatedLineItem {
  productId?: string | null;
  productVariantId?: string | null;
  description: string;
  quantity: string;
  unitPriceMinor: bigint;
  taxAmountMinor: bigint;
  totalAmountMinor: bigint;
  taxRateBasisPoints: number;
}

export interface CalculationResult {
  subtotalMinor: bigint;
  taxAmountMinor: bigint;
  discountAmountMinor: bigint;
  totalAmountMinor: bigint;
  items: CalculatedLineItem[];
  appliedDiscount?: {
    id: string;
    code: string;
    amountMinor: bigint;
  } | null;
}

export class PricingCalculationService {
  /**
   * Orchestrates subtotal, tax calculation, and discount deduction.
   * Provides the integration surface for Developer 3's Tax and Discount modules.
   */
  static async calculateTotals(
    input: PricingCalculationInput
  ): Promise<CalculationResult> {
    let subtotalMinor = 0n;
    let totalTaxMinor = 0n;
    const calculatedItems: CalculatedLineItem[] = [];

    // 1. Process each line item and its applicable taxes
    for (const item of input.items) {
      const unitPrice = BigInt(String(item.unitPriceMinor));
      const qtyNum = parseFloat(String(item.quantity)) || 1.0;
      // Precision math in integer minor units (quantity precision 3 decimal places)
      const qtyBasis = BigInt(Math.round(qtyNum * 1000));
      const itemSubtotal = (unitPrice * qtyBasis) / 1000n;

      let taxRateBasisPoints = 0;
      if (item.productId) {
        const productTax = await prisma.productTax.findFirst({
          where: { productId: item.productId, tax: { isActive: true } },
          include: { tax: true },
        });

        if (productTax?.tax) {
          taxRateBasisPoints = productTax.tax.rateBasisPoints;
        }
      }

      const itemTax = (itemSubtotal * BigInt(taxRateBasisPoints)) / 10000n;
      const itemTotal = itemSubtotal + itemTax;

      subtotalMinor += itemSubtotal;
      totalTaxMinor += itemTax;

      calculatedItems.push({
        productId: item.productId || null,
        productVariantId: item.productVariantId || null,
        description: item.description,
        quantity: typeof item.quantity === "number" ? item.quantity.toFixed(3) : item.quantity,
        unitPriceMinor: unitPrice,
        taxAmountMinor: itemTax,
        totalAmountMinor: itemTotal,
        taxRateBasisPoints,
      });
    }

    // 2. Resolve discount (Developer 3 interface contract)
    let discountAmountMinor = 0n;
    let appliedDiscount: { id: string; code: string; amountMinor: bigint } | null = null;

    if (input.discountCode) {
      const discount = await prisma.discount.findFirst({
        where: {
          code: { equals: input.discountCode.trim(), mode: "insensitive" },
          isActive: true,
        },
      });

      if (discount) {
        const now = new Date();
        const isNotExpired =
          (!discount.startDate || discount.startDate <= now) &&
          (!discount.endDate || discount.endDate >= now);

        const hasRemainingRedemptions =
          discount.maxRedemptions === null ||
          discount.currentRedemptions < discount.maxRedemptions;

        if (isNotExpired && hasRemainingRedemptions) {
          if (discount.discountType === DiscountType.PERCENTAGE) {
            discountAmountMinor =
              (subtotalMinor * discount.valueMinorOrBasisPoints) / 10000n;
          } else {
            discountAmountMinor =
              discount.valueMinorOrBasisPoints > subtotalMinor
                ? subtotalMinor
                : discount.valueMinorOrBasisPoints;
          }

          appliedDiscount = {
            id: discount.id,
            code: discount.code,
            amountMinor: discountAmountMinor,
          };
        }
      }
    }

    // 3. Final total calculation: Subtotal + Tax - Discount
    let grandTotal = subtotalMinor + totalTaxMinor - discountAmountMinor;
    if (grandTotal < 0n) {
      grandTotal = 0n;
    }

    return {
      subtotalMinor,
      taxAmountMinor: totalTaxMinor,
      discountAmountMinor,
      totalAmountMinor: grandTotal,
      items: calculatedItems,
      appliedDiscount,
    };
  }
}

