import { ProductService } from "./product.service";
import { TaxCalculationService } from "./tax-calculation.service";
import { DiscountCalculationService } from "./discount-calculation.service";
import {
  PricingCalculationResult,
  TaxComponentBreakdown,
} from "@sms/shared";
import { ValidationError } from "../utils/errors";

export interface PricingEngineItemInput {
  productId: string;
  productVariantId?: string | null;
  quantity?: string | number;
  unitPriceMinor?: string | bigint;
  description?: string;
}

export interface PricingEngineInput {
  items: PricingEngineItemInput[];
  discountCode?: string | null;
  customerId?: string | null;
  currency?: string;
  isInclusiveTax?: boolean;
}

export class PricingService {
  /**
   * Authoritative backend pricing calculation engine.
   * Usable by Quotations, Invoices, Subscriptions, and Checkout.
   */
  static async calculatePricing(
    input: PricingEngineInput
  ): Promise<PricingCalculationResult> {
    if (!input.items || input.items.length === 0) {
      throw new ValidationError("Pricing calculation requires at least one item");
    }

    const currency = input.currency || "INR";
    let subtotalMinor = 0n;
    const resolvedItems: PricingCalculationResult["items"] = [];
    const productIds: string[] = [];

    // 1. Resolve unit prices, quantities, and line subtotals
    for (const item of input.items) {
      let unitPrice: bigint;
      let description = item.description || "";

      if (item.unitPriceMinor !== undefined && item.unitPriceMinor !== null) {
        unitPrice = BigInt(item.unitPriceMinor);
      } else {
        const { product, variant, finalPriceMinor } =
          await ProductService.getProductWithVariant(
            item.productId,
            item.productVariantId || undefined
          );
        unitPrice = BigInt(finalPriceMinor);
        if (!description) {
          description = variant
            ? `${product.name} (${variant.name})`
            : product.name;
        }
      }

      const qtyNum = Number(item.quantity || 1);
      const qtyScaled = BigInt(Math.round(qtyNum * 1000));
      const lineSubtotalMinor = (unitPrice * qtyScaled) / 1000n;

      subtotalMinor += lineSubtotalMinor;
      productIds.push(item.productId);

      resolvedItems.push({
        productId: item.productId,
        productVariantId: item.productVariantId || null,
        description,
        quantity: String(item.quantity || "1.000"),
        unitPriceMinor: unitPrice.toString(),
        subtotalMinor: lineSubtotalMinor.toString(),
        discountMinor: "0",
        taxAmountMinor: "0",
        totalAmountMinor: lineSubtotalMinor.toString(),
        applicableTaxes: [],
      });
    }

    // 2. Resolve discount (if code provided)
    let discountTotalMinor = 0n;
    const discountBreakdown: PricingCalculationResult["discountBreakdown"] = [];

    if (input.discountCode && input.discountCode.trim()) {
      const discountValidation =
        await DiscountCalculationService.validateAndCalculateDiscount(
          input.discountCode,
          {
            customerId: input.customerId || undefined,
            productIds,
            subtotalMinor,
          }
        );

      if (discountValidation.valid && discountValidation.discount) {
        discountTotalMinor = discountValidation.amountDeductedMinor;
        discountBreakdown.push({
          discountId: discountValidation.discount.id,
          code: discountValidation.discount.code,
          name: discountValidation.discount.name,
          discountType: discountValidation.discount.discountType,
          amountMinor: discountTotalMinor.toString(),
        });
      }
    }

    // 3. Determine taxable amount (subtotal - discount)
    const taxableAmountMinor =
      subtotalMinor > discountTotalMinor ? subtotalMinor - discountTotalMinor : 0n;

    // Distribute discount proportionally across line items for accurate item taxes
    let remainingDiscountToDistribute = discountTotalMinor;
    for (let i = 0; i < resolvedItems.length; i++) {
      const item = resolvedItems[i];
      if (!item) continue;
      const itemSubtotal = BigInt(item.subtotalMinor);
      let itemDiscount = 0n;

      if (subtotalMinor > 0n && discountTotalMinor > 0n) {
        if (i === resolvedItems.length - 1) {
          itemDiscount = remainingDiscountToDistribute;
        } else {
          itemDiscount = (itemSubtotal * discountTotalMinor) / subtotalMinor;
          remainingDiscountToDistribute -= itemDiscount;
        }
      }

      item.discountMinor = itemDiscount.toString();
    }

    // 4. Calculate line-item product taxes
    let taxTotalMinor = 0n;
    const aggregatedTaxesMap = new Map<
      string,
      { taxId?: string; taxCode: string; name: string; rateBps: number; amountMinor: bigint }
    >();

    for (const item of resolvedItems) {
      const itemSubtotal = BigInt(item.subtotalMinor);
      const itemDiscount = BigInt(item.discountMinor);
      const itemTaxable = itemSubtotal > itemDiscount ? itemSubtotal - itemDiscount : 0n;

      const { taxTotalMinor: itemTax, breakdown } =
        await TaxCalculationService.calculateItemTaxes(
          item.productId,
          itemTaxable,
          input.isInclusiveTax ?? false
        );

      item.taxAmountMinor = itemTax.toString();
      item.totalAmountMinor = (itemTaxable + itemTax).toString();
      item.applicableTaxes = breakdown;
      taxTotalMinor += itemTax;

      for (const comp of breakdown) {
        const key = comp.taxCode;
        const current = aggregatedTaxesMap.get(key);
        if (current) {
          current.amountMinor += BigInt(comp.amountMinor);
        } else {
          aggregatedTaxesMap.set(key, {
            taxId: comp.taxId,
            taxCode: comp.taxCode,
            name: comp.name,
            rateBps: comp.rateBps,
            amountMinor: BigInt(comp.amountMinor),
          });
        }
      }
    }

    const taxBreakdown: TaxComponentBreakdown[] = Array.from(
      aggregatedTaxesMap.values()
    ).map((t) => ({
      taxId: t.taxId,
      taxCode: t.taxCode,
      name: t.name,
      rateBps: t.rateBps,
      amountMinor: t.amountMinor.toString(),
    }));

    // 5. Grand total = Taxable Amount + Total Tax
    const grandTotalMinor = taxableAmountMinor + taxTotalMinor;

    return {
      currency,
      subtotalMinor: subtotalMinor.toString(),
      discountTotalMinor: discountTotalMinor.toString(),
      taxableAmountMinor: taxableAmountMinor.toString(),
      taxTotalMinor: taxTotalMinor.toString(),
      grandTotalMinor: grandTotalMinor.toString(),
      items: resolvedItems,
      discountBreakdown,
      taxBreakdown,
    };
  }
}
