import { prisma } from "../database/prisma";
import { NotFoundError } from "../utils/errors";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";

export class CustomerService {
  /**
   * Contract A: Lookup customer by customerId
   */
  static async getCustomerById(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError(`Customer with ID ${customerId} not found`);
    }

    return customer;
  }

  /**
   * Contract A: Lookup customer by userId
   */
  static async getCustomerByUserId(userId: string) {
    const customer = await prisma.customer.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError(`Customer for User ID ${userId} not found`);
    }

    return customer;
  }

  /**
   * Create a customer directly (e.g. by Staff or Admin)
   */
  static async createCustomer(
    data: {
      email: string;
      fullName: string;
      companyName?: string | null;
      phone?: string | null;
      billingAddressLine1?: string | null;
      billingAddressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string;
      currency?: string;
      gstOrTaxId?: string | null;
      notes?: string | null;
    },
    actorUserId?: string
  ) {
    const customer = await prisma.customer.create({
      data: {
        email: data.email.toLowerCase().trim(),
        fullName: data.fullName.trim(),
        companyName: data.companyName || null,
        phone: data.phone || null,
        billingAddressLine1: data.billingAddressLine1 || null,
        billingAddressLine2: data.billingAddressLine2 || null,
        city: data.city || null,
        state: data.state || null,
        postalCode: data.postalCode || null,
        country: data.country || "India",
        currency: data.currency || "INR",
        gstOrTaxId: data.gstOrTaxId || null,
        notes: data.notes || null,
        isActive: true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "CREATE_CUSTOMER",
      entityType: "CUSTOMER",
      entityId: customer.id,
      afterData: customer,
    });

    return customer;
  }

  /**
   * List customers with pagination and search
   */
  static async getCustomers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [params.sortBy || "createdAt"]: params.sortOrder || "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const pagination: PaginationParams = {
      page,
      pageSize,
      total,
    };

    return { customers, pagination };
  }

  /**
   * Update an existing customer record
   */
  static async updateCustomer(
    customerId: string,
    data: any,
    actorUserId?: string
  ) {
    const existing = await CustomerService.getCustomerById(customerId);

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    await createAuditLog({
      actorUserId,
      action: "UPDATE_CUSTOMER",
      entityType: "CUSTOMER",
      entityId: customerId,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }
}
