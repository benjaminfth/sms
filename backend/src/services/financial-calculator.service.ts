import { prisma } from "../database/prisma";
import { DiscountType } from "@sms/shared";

export interface LineItemCalculationInput {
  productId?: string | null;
  productVariantId?: string | null;
  quantity: string | number; // Decimal string e.g. "1.000"
  unitPriceMinor: bigint;
  description?: string | null;
}

export interface CalculatedLineItem {
  productId?: string | null;
  productVariantId?: string | null;
  description: string;
  quantity: string;
  unitPriceMinor: bigint;
  subtotalMinor: bigint;
  taxAmountMinor: bigint;
  totalAmountMinor: bigint;
  taxRatesApplied: Array<{
    code: string;
    name: string;
    rateBps: number;
    amountMinor: bigint;
  }>;
}

export interface CalculationResult {
  items: CalculatedLineItem[];
  subtotalMinor: bigint;
  taxAmountMinor: bigint;
  discountAmountMinor: bigint;
  totalAmountMinor: bigint;
  appliedDiscount?: {
    discountId: string;
    code: string;
    name: string;
    amountDeductedMinor: bigint;
  } | null;
  taxBreakdown: Array<{
    taxCode: string;
    name: string;
    rateBps: number;
    amountMinor: bigint;
  }>;
}

/**
 * Multiplies a decimal quantity (scaled to 3 decimal places) by unitPriceMinor using pure BigInt arithmetic.
 */
export function calculateLineSubtotal(quantityStr: string | number, unitPriceMinor: bigint): bigint {
  const qtyNum = typeof quantityStr === "number" ? quantityStr : parseFloat(quantityStr);
  const qtyScaled = BigInt(Math.round(qtyNum * 1000));
  return (qtyScaled * unitPriceMinor) / 1000n;
}

export class FinancialCalculatorService {
  /**
   * Authoritative calculation interface agreed with Developer 3.
   * Performs integer minor unit calculations for line items, taxes (ProductTax relations),
   * and discounts.
   */
  static async calculateTotals(params: {
    items: LineItemCalculationInput[];
    customerId: string;
    discountCode?: string | null;
    currency?: string;
  }): Promise<CalculationResult> {
    const { items, discountCode } = params;

    let aggregateSubtotalMinor = 0n;
    let aggregateTaxMinor = 0n;
    const taxMap = new Map<string, { taxCode: string; name: string; rateBps: number; amountMinor: bigint }>();

    // 1. Fetch product taxes for items with productId
    const productIds = items
      .map((i) => i.productId)
      .filter((id): id is string => Boolean(id));

    const productTaxes = productIds.length > 0
      ? await prisma.productTax.findMany({
          where: { productId: { in: productIds } },
          include: { tax: true },
        })
      : [];

    // Map productId -> active taxes
    const taxByProduct = new Map<string, Array<{ code: string; name: string; rateBasisPoints: number }>>();
    for (const pt of productTaxes) {
      if (pt.tax.isActive) {
        const existing = taxByProduct.get(pt.productId) || [];
        existing.push({
          code: pt.tax.code,
          name: pt.tax.name,
          rateBasisPoints: pt.tax.rateBasisPoints,
        });
        taxByProduct.set(pt.productId, existing);
      }
    }

    const calculatedItems: CalculatedLineItem[] = [];

    // 2. Calculate line item subtotals and item-level taxes
    for (const item of items) {
      const lineSubtotal = calculateLineSubtotal(item.quantity, item.unitPriceMinor);
      aggregateSubtotalMinor += lineSubtotal;

      let lineTaxMinor = 0n;
      const lineTaxesApplied: CalculatedLineItem["taxRatesApplied"] = [];

      const applicableTaxes = item.productId ? taxByProduct.get(item.productId) || [] : [];

      for (const tax of applicableTaxes) {
        // Tax Amount = (lineSubtotal * rateBasisPoints) / 10,000 (100% = 10,000 bps)
        const taxPortion = (lineSubtotal * BigInt(tax.rateBasisPoints)) / 10000n;
        lineTaxMinor += taxPortion;

        lineTaxesApplied.push({
          code: tax.code,
          name: tax.name,
          rateBps: tax.rateBasisPoints,
          amountMinor: taxPortion,
        });

        // Add to aggregate breakdown
        const existingAgg = taxMap.get(tax.code);
        if (existingAgg) {
          existingAgg.amountMinor += taxPortion;
        } else {
          taxMap.set(tax.code, {
            taxCode: tax.code,
            name: tax.name,
            rateBps: tax.rateBasisPoints,
            amountMinor: taxPortion,
          });
        }
      }

      aggregateTaxMinor += lineTaxMinor;

      calculatedItems.push({
        productId: item.productId,
        productVariantId: item.productVariantId,
        description: item.description || "Subscription Item",
        quantity: String(item.quantity),
        unitPriceMinor: item.unitPriceMinor,
        subtotalMinor: lineSubtotal,
        taxAmountMinor: lineTaxMinor,
        totalAmountMinor: lineSubtotal + lineTaxMinor,
        taxRatesApplied: lineTaxesApplied,
      });
    }

    // 3. Discount calculation
    let aggregateDiscountMinor = 0n;
    let appliedDiscount: CalculationResult["appliedDiscount"] = null;

    if (discountCode) {
      const discount = await prisma.discount.findUnique({
        where: { code: discountCode },
      });

      if (discount && discount.isActive) {
        const now = new Date();
        const isValidDate =
          (!discount.startDate || discount.startDate <= now) &&
          (!discount.endDate || discount.endDate >= now);

        const hasRemainingRedemptions =
          discount.maxRedemptions === null ||
          discount.currentRedemptions < discount.maxRedemptions;

        if (isValidDate && hasRemainingRedemptions) {
          if (discount.discountType === DiscountType.PERCENTAGE) {
            // valueMinorOrBasisPoints is in basis points e.g. 2000 for 20.00%
            aggregateDiscountMinor =
              (aggregateSubtotalMinor * discount.valueMinorOrBasisPoints) / 10000n;
          } else {
            // FIXED_AMOUNT in minor units
            aggregateDiscountMinor = discount.valueMinorOrBasisPoints;
            if (aggregateDiscountMinor > aggregateSubtotalMinor) {
              aggregateDiscountMinor = aggregateSubtotalMinor;
            }
          }

          appliedDiscount = {
            discountId: discount.id,
            code: discount.code,
            name: discount.name,
            amountDeductedMinor: aggregateDiscountMinor,
          };
        }
      }
    }

    const grandTotalMinor = aggregateSubtotalMinor + aggregateTaxMinor - aggregateDiscountMinor;

    return {
      items: calculatedItems,
      subtotalMinor: aggregateSubtotalMinor,
      taxAmountMinor: aggregateTaxMinor,
      discountAmountMinor: aggregateDiscountMinor,
      totalAmountMinor: grandTotalMinor < 0n ? 0n : grandTotalMinor,
      appliedDiscount,
      taxBreakdown: Array.from(taxMap.values()),
    };
  }
}
