import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import {
  Role,
  ProductType,
  PriceAdjustmentType,
  BillingInterval,
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
