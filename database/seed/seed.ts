import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import {
  Role,
  ProductType,
  PriceAdjustmentType,
  BillingInterval,
  DiscountType,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  QuotationStatus,
  SubscriptionStatus,
} from "../../shared/src/enums";

async function main() {
  console.log("🌱 Starting idempotent database seed for Brightloop SMS...");

  const defaultPassword = "Brightloop!2026";
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  // 1. Seed Admin User
  const adminEmail = "admin@brightloop.demo";
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: "Brightloop Admin",
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: "Brightloop Admin",
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Admin user seeded: ${adminUser.email} (${adminUser.id})`);

  // 2. Seed Staff User
  const staffEmail = "staff@brightloop.demo";
  const staffUser = await prisma.user.upsert({
    where: { email: staffEmail },
    update: {
      fullName: "Brightloop Operations Staff",
      role: Role.STAFF,
      isActive: true,
    },
    create: {
      email: staffEmail,
      passwordHash,
      fullName: "Brightloop Operations Staff",
      role: Role.STAFF,
      isActive: true,
    },
  });
  console.log(`✅ Staff user seeded: ${staffUser.email} (${staffUser.id})`);

  // 3. Seed Customer User & Linked Customer Record
  const customerEmail = "customer@brightloop.demo";
  const customerUser = await prisma.user.upsert({
    where: { email: customerEmail },
    update: {
      fullName: "Demo Enterprise Customer",
      role: Role.CUSTOMER,
      isActive: true,
    },
    create: {
      email: customerEmail,
      passwordHash,
      fullName: "Demo Enterprise Customer",
      role: Role.CUSTOMER,
      isActive: true,
    },
  });

  const customerRecord = await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {
      email: customerEmail,
      fullName: "Demo Enterprise Customer",
      companyName: "Acme Global Solutions Pvt Ltd",
      phone: "+91 98765 43210",
      billingAddressLine1: "Tower B, Cyber City, Phase 2",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560100",
      country: "India",
      currency: "INR",
      gstOrTaxId: "29AAAAA0000A1Z5",
      isActive: true,
    },
    create: {
      userId: customerUser.id,
      email: customerEmail,
      fullName: "Demo Enterprise Customer",
      companyName: "Acme Global Solutions Pvt Ltd",
      phone: "+91 98765 43210",
      billingAddressLine1: "Tower B, Cyber City, Phase 2",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560100",
      country: "India",
      currency: "INR",
      gstOrTaxId: "29AAAAA0000A1Z5",
      isActive: true,
    },
  });
  console.log(`✅ Customer seeded: ${customerRecord.fullName} (${customerRecord.id}) linked to User ${customerUser.id}`);

  // 4. Seed Standard Taxes
  const standardGst = await prisma.tax.upsert({
    where: { code: "GST-18" },
    update: { name: "Goods & Services Tax (18%)", rateBasisPoints: 1800, isActive: true },
    create: {
      code: "GST-18",
      name: "Goods & Services Tax (18%)",
      rateBasisPoints: 1800,
      isActive: true,
    },
  });
  console.log(`✅ Standard Tax seeded: ${standardGst.code} (${standardGst.rateBasisPoints / 100}%)`);

  // 5. Seed Sample Product and Variant
  // Base product: Brightloop Professional Software (SKU: BL-PRO-001, Base price: 200000 paise = ₹2,000)
  const product = await prisma.product.upsert({
    where: { sku: "BL-PRO-001" },
    update: {
      name: "Brightloop Professional Software",
      description: "Full-suite cloud subscription management and recurring billing platform",
      productType: ProductType.SERVICE,
      baseSellingPriceMinor: BigInt(200000), // 2,000 INR
      costPriceMinor: BigInt(50000),
      currency: "INR",
      isActive: true,
      isArchived: false,
    },
    create: {
      sku: "BL-PRO-001",
      name: "Brightloop Professional Software",
      description: "Full-suite cloud subscription management and recurring billing platform",
      productType: ProductType.SERVICE,
      baseSellingPriceMinor: BigInt(200000),
      costPriceMinor: BigInt(50000),
      currency: "INR",
      isActive: true,
      isArchived: false,
    },
  });

  // Variant: Advanced Module (SKU: BL-PRO-ADV, Surcharge: 56000 paise = ₹560)
  const variant = await prisma.productVariant.upsert({
    where: { sku: "BL-PRO-ADV" },
    update: {
      productId: product.id,
      name: "Advanced Module",
      priceAdjustmentType: PriceAdjustmentType.SURCHARGE,
      priceAdjustmentMinor: BigInt(56000), // 560 INR surcharge
      isActive: true,
      isArchived: false,
    },
    create: {
      productId: product.id,
      sku: "BL-PRO-ADV",
      name: "Advanced Module",
      priceAdjustmentType: PriceAdjustmentType.SURCHARGE,
      priceAdjustmentMinor: BigInt(56000),
      isActive: true,
      isArchived: false,
    },
  });
  console.log(`✅ Product seeded: ${product.name} (Base: ₹2,000) + Variant: ${variant.name} (+₹560 surcharge)`);

  // Link Tax to Product
  await prisma.productTax.upsert({
    where: {
      productId_taxId: {
        productId: product.id,
        taxId: standardGst.id,
      },
    },
    update: {},
    create: {
      productId: product.id,
      taxId: standardGst.id,
    },
  });

  // 6. Seed Sample Monthly Plan
  // Name: Professional Monthly, Interval: MONTHLY, Interval count: 1, Amount: 256000 paise (₹2,560)
  const plan = await prisma.plan.upsert({
    where: { code: "PLAN-PRO-MONTHLY" },
    update: {
      name: "Professional Monthly",
      description: "Includes Brightloop Professional Software and Advanced Module billed monthly",
      isActive: true,
    },
    create: {
      code: "PLAN-PRO-MONTHLY",
      name: "Professional Monthly",
      description: "Includes Brightloop Professional Software and Advanced Module billed monthly",
      isActive: true,
    },
  });

  // Check or create PlanPrice
  const existingPrice = await prisma.planPrice.findFirst({
    where: {
      planId: plan.id,
      billingInterval: BillingInterval.MONTHLY,
      intervalCount: 1,
    },
  });

  if (!existingPrice) {
    await prisma.planPrice.create({
      data: {
        planId: plan.id,
        currency: "INR",
        billingInterval: BillingInterval.MONTHLY,
        intervalCount: 1,
        amountMinor: BigInt(256000), // ₹2,560
        setupFeeMinor: BigInt(0),
        isActive: true,
      },
    });
  } else {
    await prisma.planPrice.update({
      where: { id: existingPrice.id },
      data: {
        amountMinor: BigInt(256000),
        isActive: true,
      },
    });
  }

  // Check or create PlanItem
  const existingItem = await prisma.planItem.findFirst({
    where: {
      planId: plan.id,
      productId: product.id,
    },
  });

  if (!existingItem) {
    await prisma.planItem.create({
      data: {
        planId: plan.id,
        productId: product.id,
        productVariantId: variant.id,
        quantity: "1.000",
      },
    });
  }

  console.log(`✅ Plan seeded: ${plan.name} (${plan.code}) at ₹2,560/month`);

  // 7. Seed Standard Discounts
  const launchDiscount = await prisma.discount.upsert({
    where: { code: "LAUNCH20" },
    update: {
      name: "Launch Special 20% Off",
      discountType: DiscountType.PERCENTAGE,
      valueMinorOrBasisPoints: BigInt(2000), // 20.00%
      isActive: true,
      maxRedemptions: 100,
    },
    create: {
      code: "LAUNCH20",
      name: "Launch Special 20% Off",
      discountType: DiscountType.PERCENTAGE,
      valueMinorOrBasisPoints: BigInt(2000),
      isActive: true,
      maxRedemptions: 100,
    },
  });

  const flatDiscount = await prisma.discount.upsert({
    where: { code: "SAVE500" },
    update: {
      name: "Flat ₹500 Off",
      discountType: DiscountType.FIXED_AMOUNT,
      valueMinorOrBasisPoints: BigInt(50000), // ₹500 in paise
      isActive: true,
      maxRedemptions: 50,
    },
    create: {
      code: "SAVE500",
      name: "Flat ₹500 Off",
      discountType: DiscountType.FIXED_AMOUNT,
      valueMinorOrBasisPoints: BigInt(50000),
      isActive: true,
      maxRedemptions: 50,
    },
  });
  console.log(`✅ Discounts seeded: ${launchDiscount.code} (20%) & ${flatDiscount.code} (₹500 off)`);

  // 8. Seed Customer Quotation & Active Subscription
  const quotation = await prisma.quotation.upsert({
    where: { quotationNumber: "QUO-2026-0001" },
    update: {
      status: QuotationStatus.ACCEPTED,
      totalAmountMinor: BigInt(256000),
    },
    create: {
      quotationNumber: "QUO-2026-0001",
      customerId: customerRecord.id,
      status: QuotationStatus.ACCEPTED,
      totalAmountMinor: BigInt(256000),
      currency: "INR",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: "Enterprise kickoff quotation for Acme Global Solutions",
    },
  });

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const subscription = await prisma.subscription.upsert({
    where: { subscriptionNumber: "SUB-2026-0001" },
    update: {
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate: nextMonth,
    },
    create: {
      subscriptionNumber: "SUB-2026-0001",
      customerId: customerRecord.id,
      planId: plan.id,
      quotationId: quotation.id,
      status: SubscriptionStatus.ACTIVE,
      billingInterval: BillingInterval.MONTHLY,
      intervalCount: 1,
      currency: "INR",
      currentPeriodStart: new Date(),
      currentPeriodEnd: nextMonth,
      nextBillingDate: nextMonth,
    },
  });

  // 9. Seed Sample Invoices (One Outstanding, One Paid)
  // Outstanding Invoice: INV-2026-0001 (Due in 7 days, ₹3,020.80)
  const outstandingInvoice = await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-2026-0001" },
    update: {
      status: InvoiceStatus.ISSUED,
      subtotalMinor: BigInt(256000),
      taxAmountMinor: BigInt(46080), // 18% of 256000
      totalAmountMinor: BigInt(302080),
      amountPaidMinor: BigInt(0),
      balanceDueMinor: BigInt(302080),
    },
    create: {
      invoiceNumber: "INV-2026-0001",
      subscriptionId: subscription.id,
      customerId: customerRecord.id,
      status: InvoiceStatus.ISSUED,
      currency: "INR",
      subtotalMinor: BigInt(256000),
      taxAmountMinor: BigInt(46080),
      totalAmountMinor: BigInt(302080),
      amountPaidMinor: BigInt(0),
      balanceDueMinor: BigInt(302080),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      billingPeriodStart: new Date(),
      billingPeriodEnd: nextMonth,
    },
  });

  // Historical Paid Invoice: INV-2026-0002 (Settled via Payment PAY-2026-0001)
  const pastPaidDate = new Date();
  pastPaidDate.setDate(pastPaidDate.getDate() - 15);

  const paidInvoice = await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-2026-0002" },
    update: {
      status: InvoiceStatus.PAID,
      subtotalMinor: BigInt(200000),
      taxAmountMinor: BigInt(36000),
      totalAmountMinor: BigInt(236000),
      amountPaidMinor: BigInt(236000),
      balanceDueMinor: BigInt(0),
      paidAt: pastPaidDate,
    },
    create: {
      invoiceNumber: "INV-2026-0002",
      subscriptionId: subscription.id,
      customerId: customerRecord.id,
      status: InvoiceStatus.PAID,
      currency: "INR",
      subtotalMinor: BigInt(200000),
      taxAmountMinor: BigInt(36000),
      totalAmountMinor: BigInt(236000),
      amountPaidMinor: BigInt(236000),
      balanceDueMinor: BigInt(0),
      dueDate: pastPaidDate,
      paidAt: pastPaidDate,
    },
  });

  // Historical Payment & Allocation
  const pastPayment = await prisma.payment.upsert({
    where: { paymentReference: "PAY-2026-0001" },
    update: {
      status: PaymentStatus.COMPLETED,
      amountMinor: BigInt(236000),
      paidAt: pastPaidDate,
    },
    create: {
      paymentReference: "PAY-2026-0001",
      customerId: customerRecord.id,
      amountMinor: BigInt(236000),
      currency: "INR",
      paymentMethod: PaymentMethod.UPI,
      status: PaymentStatus.COMPLETED,
      notes: "Initial setup & onboarding payment",
      paidAt: pastPaidDate,
    },
  });

  const existingAlloc = await prisma.paymentAllocation.findFirst({
    where: {
      paymentId: pastPayment.id,
      invoiceId: paidInvoice.id,
    },
  });

  if (!existingAlloc) {
    await prisma.paymentAllocation.create({
      data: {
        paymentId: pastPayment.id,
        invoiceId: paidInvoice.id,
        allocatedAmountMinor: BigInt(236000),
        createdAt: pastPaidDate,
      },
    });
  }

  console.log(`✅ Demo Invoices & Historical Payment seeded: Outstanding ${outstandingInvoice.invoiceNumber} (₹3,020.80) & Paid ${paidInvoice.invoiceNumber}`);

  console.log("✨ Seed completed successfully! Environment is ready.");
}

main()
  .catch((e) => {
    console.error("❌ Error during database seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
