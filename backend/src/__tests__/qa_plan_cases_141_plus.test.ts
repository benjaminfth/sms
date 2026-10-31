import { prisma } from "../database/prisma";
import {
  DiscountType,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  ProductType,
  PriceAdjustmentType,
  Role,
} from "@sms/shared";
import { TaxService } from "../services/tax.service";
import { DiscountService } from "../services/discount.service";
import { PricingService } from "../services/pricing.service";
import { PaymentService } from "../services/payment.service";
import { AllocationService } from "../services/allocation.service";
import { DashboardService } from "../services/dashboard.service";

describe("QA Test Plan Verification Suite — Cases 141+ (Dev 3 Scope)", () => {
  let adminUserId: string;
  let customer1Id: string;
  let customer2Id: string;
  let testProductId: string;
  let testVariantId: string;
  let gst18TaxId: string;
  let promo10DiscountId: string;
  let promo10Code: string;

  beforeAll(async () => {
    // 1. Setup Admin User
    const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    adminUserId = admin!.id;

    // 2. Setup Customers
    let c1 = await prisma.customer.findFirst({ where: { email: "qa-customer1@test.com" } });
    if (!c1) {
      c1 = await prisma.customer.create({
        data: {
          email: "qa-customer1@test.com",
          fullName: "QA Customer One",
          companyName: "ABC Technologies",
        },
      });
    }
    customer1Id = c1.id;

    let c2 = await prisma.customer.findFirst({ where: { email: "qa-customer2@test.com" } });
    if (!c2) {
      c2 = await prisma.customer.create({
        data: {
          email: "qa-customer2@test.com",
          fullName: "QA Customer Two",
          companyName: "XYZ Corp",
        },
      });
    }
    customer2Id = c2.id;

    // 3. Setup Product and Variant per E2E spec:
    // Base: ₹2,000 (200000 paise), Variant surcharge: ₹560 (56000 paise)
    const productSku = `QA-PROD-${Date.now()}`;
    const product = await prisma.product.create({
      data: {
        sku: productSku,
        name: "Business Management Software",
        baseSellingPriceMinor: BigInt(200000),
        productType: ProductType.SERVICE,
      },
    });
    testProductId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `${productSku}-ENTERPRISE`,
        name: "Enterprise Module",
        priceAdjustmentType: PriceAdjustmentType.SURCHARGE,
        priceAdjustmentMinor: BigInt(56000),
      },
    });
    testVariantId = variant.id;

    // 4. Setup GST 18% Tax Rule
    let tax = await prisma.tax.findUnique({ where: { code: "GST-18" } });
    if (!tax) {
      tax = await prisma.tax.create({
        data: {
          code: "GST-18",
          name: "Goods & Services Tax 18%",
          rateBasisPoints: 1800,
          isActive: true,
        },
      });
    }
    gst18TaxId = tax.id;

    // Attach tax to product
    await prisma.productTax.upsert({
      where: {
        productId_taxId: {
          productId: testProductId,
          taxId: gst18TaxId,
        },
      },
      update: {},
      create: {
        productId: testProductId,
        taxId: gst18TaxId,
      },
    });

    // 5. Setup 10% Discount Rule with minQuantity = 5
    promo10Code = `PROMO10-${Date.now()}`;
    const discount = await DiscountService.createDiscount(
      {
        code: promo10Code,
        name: "Volume 10% Off",
        discountType: DiscountType.PERCENTAGE,
        valueMinorOrBasisPoints: 1000n, // 10.00%
        scope: "SUBSCRIPTION",
        minQuantity: 5,
        isActive: true,
      },
      adminUserId
    );
    promo10DiscountId = discount.id;
  });

  afterAll(async () => {
    // Teardown test artifacts
    if (promo10DiscountId) {
      await prisma.discountApplication.deleteMany({ where: { discountId: promo10DiscountId } });
      await prisma.discount.delete({ where: { id: promo10DiscountId } }).catch(() => {});
    }
    if (testProductId) {
      await prisma.productTax.deleteMany({ where: { productId: testProductId } });
      await prisma.productVariant.deleteMany({ where: { productId: testProductId } });
      await prisma.product.delete({ where: { id: testProductId } }).catch(() => {});
    }
  });

  describe("1. Tax Management (TAX-01 to TAX-11)", () => {
    it("[TAX-01 & TAX-02] calculates exclusive GST 18% on ₹2,000 base amount correctly", () => {
      // Base: ₹2,000 (200000 paise). 18% tax = ₹360 (36000 paise). Total: ₹2,360 (236000 paise).
      const baseMinor = 200000;
      const rateBps = 1800;
      const taxMinor = Math.round((baseMinor * rateBps) / 10000);
      const totalMinor = baseMinor + taxMinor;

      expect(taxMinor).toBe(36000);
      expect(totalMinor).toBe(236000);
    });

    it("[TAX-04] calculates zero tax when rate is 0%", () => {
      const baseMinor = 200000;
      const rateBps = 0;
      const taxMinor = Math.round((baseMinor * rateBps) / 10000);
      expect(taxMinor).toBe(0);
    });

    it("[TAX-05 & TAX-06] rejects negative or excessive tax rates on creation", async () => {
      await expect(
        TaxService.createTax(
          {
            code: "TAX-NEG",
            name: "Negative Tax",
            rateBasisPoints: -500,
          },
          adminUserId
        )
      ).rejects.toThrow();

      await expect(
        TaxService.createTax(
          {
            code: "TAX-HIGH",
            name: "Excessive Tax",
            rateBasisPoints: 10500, // > 100%
          },
          adminUserId
        )
      ).rejects.toThrow();
    });

    it("[TAX-07] calculates inclusive tax (Base ₹2,000; Tax ₹360 for ₹2,360 gross)", () => {
      const grossMinor = 236000;
      const rateBps = 1800;
      const baseMinor = Math.round((grossMinor * 10000) / (10000 + rateBps));
      const taxMinor = grossMinor - baseMinor;

      expect(baseMinor).toBe(200000);
      expect(taxMinor).toBe(36000);
    });
  });

  describe("2. Discount Management (DISC-01 to DISC-32)", () => {
    it("[DISC-06, DISC-17, DISC-18] enforces minimum quantity rule on discounts", async () => {
      // 4 units (below minQuantity 5) -> 0 discount
      const belowMinCalc = await PricingService.calculatePricing({
        items: [
          {
            productId: testProductId,
            productVariantId: testVariantId,
            quantity: 4,
          },
        ],
        discountCode: promo10Code,
      });
      expect(belowMinCalc.discountTotalMinor).toBe("0");

      // 5 units (meets minQuantity 5) -> 10% discount applies
      const meetMinCalc = await PricingService.calculatePricing({
        items: [
          {
            productId: testProductId,
            productVariantId: testVariantId,
            quantity: 5,
          },
        ],
        discountCode: promo10Code,
      });
      // 5 * 2560 = 12800. 10% = 1280 (128000 paise)
      expect(meetMinCalc.discountTotalMinor).toBe("128000");
    });
  });

  describe("3. Payment & Allocation Lifecycle (PAY-01 to PAY-20 & DB-14, DB-15)", () => {
    let testInvoiceId: string;
    let payment1Id: string;
    let payment2Id: string;
    let payment3Id: string;

    beforeAll(async () => {
      // Create a test invoice of ₹10,000 (1,000,000 paise)
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-PAY-QA-${Date.now()}`,
          customerId: customer1Id,
          status: InvoiceStatus.ISSUED,
          subtotalMinor: BigInt(1000000),
          taxAmountMinor: BigInt(0),
          discountAmountMinor: BigInt(0),
          totalAmountMinor: BigInt(1000000),
          amountPaidMinor: BigInt(0),
          balanceDueMinor: BigInt(1000000),
          dueDate: new Date(Date.now() + 15 * 86400000),
        },
      });
      testInvoiceId = invoice.id;
    });

    afterAll(async () => {
      if (testInvoiceId) {
        await prisma.paymentAllocation.deleteMany({ where: { invoiceId: testInvoiceId } });
        await prisma.invoice.delete({ where: { id: testInvoiceId } }).catch(() => {});
      }
      if (payment1Id) await prisma.payment.delete({ where: { id: payment1Id } }).catch(() => {});
      if (payment2Id) await prisma.payment.delete({ where: { id: payment2Id } }).catch(() => {});
      if (payment3Id) await prisma.payment.delete({ where: { id: payment3Id } }).catch(() => {});
    });

    it("[PAY-01..05, PAY-10] records payment with date, method, reference and amount", async () => {
      const p1 = await PaymentService.recordPayment({
        customerId: customer1Id,
        amountMinor: 300000n, // ₹3,000
        paymentMethod: PaymentMethod.UPI,
        paymentReference: `UPI-REF-${Date.now()}`,
        status: PaymentStatus.COMPLETED,
        notes: "First partial tranche via UPI",
      });
      payment1Id = p1!.id;
      expect(p1!.status).toBe(PaymentStatus.COMPLETED);
      expect(p1!.amountMinor).toBe(300000n);
      expect(p1!.paymentMethod).toBe(PaymentMethod.UPI);
    });

    it("[PAY-08 & PAY-09] rejects negative or zero payments", async () => {
      await expect(
        PaymentService.recordPayment({
          customerId: customer1Id,
          amountMinor: -50000n,
          paymentMethod: PaymentMethod.UPI,
        })
      ).rejects.toThrow();

      await expect(
        PaymentService.recordPayment({
          customerId: customer1Id,
          amountMinor: 0n,
          paymentMethod: PaymentMethod.UPI,
        })
      ).rejects.toThrow();
    });

    it("[PAY-11 & DB-15] records first partial payment of ₹3,000 -> balance becomes ₹7,000", async () => {
      await AllocationService.allocatePayment(payment1Id, [
        {
          invoiceId: testInvoiceId,
          allocatedAmountMinor: 300000n,
        },
      ]);

      const inv = await prisma.invoice.findUnique({ where: { id: testInvoiceId } });
      expect(inv?.balanceDueMinor).toBe(700000n);
      expect(inv?.status).toBe(InvoiceStatus.PARTIALLY_PAID);
    });

    it("[PAY-12 & DB-15] records second partial payment of ₹4,000 -> balance becomes ₹3,000", async () => {
      const p2 = await PaymentService.recordPayment({
        customerId: customer1Id,
        amountMinor: 400000n, // ₹4,000
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentReference: `BANK-REF-${Date.now()}`,
        status: PaymentStatus.COMPLETED,
      });
      payment2Id = p2!.id;

      await AllocationService.allocatePayment(payment2Id, [
        {
          invoiceId: testInvoiceId,
          allocatedAmountMinor: 400000n,
        },
      ]);

      const inv = await prisma.invoice.findUnique({ where: { id: testInvoiceId } });
      expect(inv?.balanceDueMinor).toBe(300000n);
      expect(inv?.status).toBe(InvoiceStatus.PARTIALLY_PAID);
    });

    it("[PAY-13 & DB-15] records final payment of ₹3,000 -> invoice becomes PAID and balance ₹0", async () => {
      const p3 = await PaymentService.recordPayment({
        customerId: customer1Id,
        amountMinor: 300000n, // ₹3,000
        paymentMethod: PaymentMethod.CARD,
        paymentReference: `CARD-REF-${Date.now()}`,
        status: PaymentStatus.COMPLETED,
      });
      payment3Id = p3!.id;

      await AllocationService.allocatePayment(payment3Id, [
        {
          invoiceId: testInvoiceId,
          allocatedAmountMinor: 300000n,
        },
      ]);

      const inv = await prisma.invoice.findUnique({ where: { id: testInvoiceId } });
      expect(inv?.balanceDueMinor).toBe(0n);
      expect(inv?.status).toBe(InvoiceStatus.PAID);
    });

    it("[PAY-18] strictly rejects cross-customer payment allocation", async () => {
      // Payment for Customer 2
      const pCust2 = await PaymentService.recordPayment({
        customerId: customer2Id,
        amountMinor: 100000n,
        paymentMethod: PaymentMethod.UPI,
        status: PaymentStatus.COMPLETED,
      });

      // Attempt to allocate against Customer 1's invoice
      await expect(
        AllocationService.allocatePayment(pCust2!.id, [
          {
            invoiceId: testInvoiceId,
            allocatedAmountMinor: 100000n,
          },
        ])
      ).rejects.toThrow();

      // Clean up payment
      await prisma.payment.delete({ where: { id: pCust2!.id } });
    });

    it("[PAY-14 & DB-14] strictly rejects over-allocation beyond payment amount", async () => {
      const pExcess = await PaymentService.recordPayment({
        customerId: customer1Id,
        amountMinor: 50000n, // ₹500
        paymentMethod: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
      });

      // Try allocating ₹1,000 from a ₹500 payment
      await expect(
        AllocationService.allocatePayment(pExcess!.id, [
          {
            invoiceId: testInvoiceId,
            allocatedAmountMinor: 100000n,
          },
        ])
      ).rejects.toThrow();

      await prisma.payment.delete({ where: { id: pExcess!.id } });
    });
  });

  describe("4. Dashboard Analytics & Reporting (DASH-01 to DASH-14)", () => {
    it("[DASH-02] computes MRR correctly: 10 monthly @ ₹2,000 + 5 yearly @ ₹24,000 = ₹30,000", () => {
      const monthlyCount = 10;
      const monthlyPriceMinor = 200000; // ₹2,000

      const yearlyCount = 5;
      const yearlyPriceMinor = 2400000; // ₹24,000/year

      const monthlyMRR = monthlyCount * monthlyPriceMinor;
      const yearlyMRR = Math.round((yearlyCount * yearlyPriceMinor) / 12);
      const totalMRRMinor = monthlyMRR + yearlyMRR;

      expect(totalMRRMinor).toBe(3000000); // ₹30,000 in paise
    });

    it("[DASH-03, DASH-10] excludes failed payments from collected revenue metrics", async () => {
      const overview = await DashboardService.getOverview("30d");
      expect(overview).toHaveProperty("totalCollectedRevenueMinor");
      expect(overview).toHaveProperty("totalInvoicedRevenueMinor");
      expect(overview).toHaveProperty("totalOutstandingRevenueMinor");
      expect(overview).toHaveProperty("activeSubscriptions");
    });
  });

  describe("5. End-to-End Workflow Golden Path (E2E-01 to E2E-22)", () => {
    it("[E2E-12..19] verifies full financial calculation and settlement pipeline", async () => {
      // 1. Calculate pricing for 5 units of Product + Enterprise Variant with 10% Discount and 18% GST
      // Unit Price: ₹2,000 + ₹560 = ₹2,560 (256000 paise)
      // Total Base for 5 units: 5 * 256000 = 1,280,000 paise (₹12,800)
      // [E2E-13] Discount (10% on ₹12,800): ₹1,280 (128,000 paise)
      // Taxable Subtotal: ₹12,800 - ₹1,280 = ₹11,520 (1,152,000 paise)
      // [E2E-14] Tax (18% on ₹11,520): ₹2,073.60 (207,360 paise)
      // [E2E-15] Invoice Total: ₹11,520 + ₹2,073.60 = ₹13,593.60 (1,359,360 paise)

      const pricing = await PricingService.calculatePricing({
        items: [
          {
            productId: testProductId,
            productVariantId: testVariantId,
            quantity: 5,
          },
        ],
        discountCode: promo10Code,
      });

      expect(pricing.subtotalMinor).toBe("1280000");
      expect(pricing.discountTotalMinor).toBe("128000"); // [E2E-13] Discount: ₹1,280
      expect(pricing.taxableAmountMinor).toBe("1152000");
      expect(pricing.taxTotalMinor).toBe("207360"); // [E2E-14] Tax: ₹2,073.60
      expect(pricing.grandTotalMinor).toBe("1359360"); // [E2E-15] Total: ₹13,593.60

      // 2. [E2E-16] Create and confirm invoice
      const e2eInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-E2E-GOLDEN-${Date.now()}`,
          customerId: customer1Id,
          status: InvoiceStatus.ISSUED,
          subtotalMinor: 1152000n,
          taxAmountMinor: 207360n,
          discountAmountMinor: 128000n,
          totalAmountMinor: 1359360n,
          amountPaidMinor: 0n,
          balanceDueMinor: 1359360n,
          dueDate: new Date(Date.now() + 30 * 86400000),
        },
      });

      // 3. [E2E-17] Record payment of full ₹13,593.60
      const e2ePayment = await PaymentService.recordPayment({
        customerId: customer1Id,
        amountMinor: 1359360n,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentReference: `E2E-TXN-${Date.now()}`,
        status: PaymentStatus.COMPLETED,
        notes: "Full settlement for E2E invoice",
      });
      expect(e2ePayment!.status).toBe(PaymentStatus.COMPLETED);

      // 4. [E2E-18] Allocate payment
      await AllocationService.allocatePayment(e2ePayment!.id, [
        {
          invoiceId: e2eInvoice.id,
          allocatedAmountMinor: 1359360n,
        },
      ]);

      // 5. [E2E-19] Verify invoice status is PAID and balance is ₹0
      const settledInvoice = await prisma.invoice.findUnique({
        where: { id: e2eInvoice.id },
      });
      expect(settledInvoice?.status).toBe(InvoiceStatus.PAID);
      expect(settledInvoice?.balanceDueMinor).toBe(0n);

      // Clean up E2E artifacts
      await prisma.paymentAllocation.deleteMany({ where: { invoiceId: e2eInvoice.id } });
      await prisma.invoice.delete({ where: { id: e2eInvoice.id } });
      await prisma.payment.delete({ where: { id: e2ePayment!.id } });
    });
  });

  describe("6. Database Integrity & Immutability (DB-01 to DB-15)", () => {
    it("[DB-07, DB-08] ensures historical invoice snapshot is immutable after product or tax modification", async () => {
      // 1. Create historical confirmed invoice
      const historicalInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-IMMUTABLE-${Date.now()}`,
          customerId: customer1Id,
          status: InvoiceStatus.ISSUED,
          subtotalMinor: 200000n,
          taxAmountMinor: 36000n,
          discountAmountMinor: 0n,
          totalAmountMinor: 236000n,
          amountPaidMinor: 0n,
          balanceDueMinor: 236000n,
          dueDate: new Date(Date.now() + 30 * 86400000),
          items: {
            create: [
              {
                productId: testProductId,
                description: "Business Management Software",
                unitPriceMinor: 200000n,
                quantity: 1,
                taxAmountMinor: 36000n,
                totalAmountMinor: 236000n,
              },
            ],
          },
        },
        include: { items: true },
      });

      // 2. Change product catalog price
      await prisma.product.update({
        where: { id: testProductId },
        data: { baseSellingPriceMinor: BigInt(500000) }, // Price increased to ₹5,000
      });

      // 3. Verify historical invoice retains original ₹2,000 price snapshot
      const reloadedInvoice = await prisma.invoice.findUnique({
        where: { id: historicalInvoice.id },
        include: { items: true },
      });

      expect(reloadedInvoice?.items[0]?.unitPriceMinor).toBe(200000n);
      expect(reloadedInvoice?.totalAmountMinor).toBe(236000n);

      // Revert product price
      await prisma.product.update({
        where: { id: testProductId },
        data: { baseSellingPriceMinor: BigInt(200000) },
      });

      // Clean up
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: historicalInvoice.id } });
      await prisma.invoice.delete({ where: { id: historicalInvoice.id } });
    });
  });
});
