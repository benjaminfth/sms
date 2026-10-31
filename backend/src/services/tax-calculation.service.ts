import { prisma } from "../database/prisma";
import { TaxComponentBreakdown } from "@sms/shared";

export interface LineItemForTax {
  productId?: string | null;
  productVariantId?: string | null;
  quantity: string | number;
  unitPriceMinor: bigint;
  isInclusive?: boolean;
}

export class TaxCalculationService {
  /**
   * Rounding integer paise calculation for exclusive tax:
   * Tax Amount = (Taxable Amount * Rate Basis Points + 5000) / 10000
   * e.g., 200000 paise (₹2000) * 1800 bps (18%) = 36000 paise (₹360)
   */
  static calculateExclusiveTax(taxableMinor: bigint, rateBasisPoints: number): bigint {
    if (taxableMinor <= 0n || rateBasisPoints <= 0) {
      return 0n;
    }
    const rateBps = BigInt(rateBasisPoints);
    return (taxableMinor * rateBps + 5000n) / 10000n;
  }

  /**
   * Rounding integer paise calculation for inclusive tax:
   * Tax Amount = (Gross Amount * Rate Basis Points + (10000 + Rate Basis Points) / 2) / (10000 + Rate Basis Points)
   */
  static calculateInclusiveTax(grossMinor: bigint, rateBasisPoints: number): bigint {
    if (grossMinor <= 0n || rateBasisPoints <= 0) {
      return 0n;
    }
    const rateBps = BigInt(rateBasisPoints);
    const denominator = 10000n + rateBps;
    return (grossMinor * rateBps + denominator / 2n) / denominator;
  }

  /**
   * Get active taxes assigned to a specific product.
   */
  static async getActiveTaxesForProduct(productId: string) {
    const productTaxes = await prisma.productTax.findMany({
      where: {
        productId,
        tax: {
          isActive: true,
        },
      },
      include: {
        tax: true,
      },
    });

    return productTaxes.map((pt) => pt.tax);
  }

  /**
   * Calculate taxes for a single item given its product ID and amount.
   */
  static async calculateItemTaxes(
    productId: string | null | undefined,
    taxableAmountMinor: bigint,
    isInclusive = false
  ): Promise<{
    taxTotalMinor: bigint;
    breakdown: TaxComponentBreakdown[];
  }> {
    if (!productId || taxableAmountMinor <= 0n) {
      return { taxTotalMinor: 0n, breakdown: [] };
    }

    const applicableTaxes = await this.getActiveTaxesForProduct(productId);
    if (!applicableTaxes || applicableTaxes.length === 0) {
      return { taxTotalMinor: 0n, breakdown: [] };
    }

    let taxTotalMinor = 0n;
    const breakdown: TaxComponentBreakdown[] = [];

    for (const tax of applicableTaxes) {
      const taxAmount = isInclusive
        ? this.calculateInclusiveTax(taxableAmountMinor, tax.rateBasisPoints)
        : this.calculateExclusiveTax(taxableAmountMinor, tax.rateBasisPoints);

      taxTotalMinor += taxAmount;
      breakdown.push({
        taxId: tax.id,
        taxCode: tax.code,
        name: tax.name,
        rateBps: tax.rateBasisPoints,
        amountMinor: taxAmount.toString(),
      });
    }

    return { taxTotalMinor, breakdown };
  }
}
