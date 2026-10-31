import { prisma } from "../database/prisma";
import { Role } from "@sms/shared";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import { hashPassword } from "../utils/token";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";

export class UserService {
  /**
   * Create staff account (ADMIN only).
   */
  static async createStaff(
    data: {
      email: string;
      password: string;
      fullName: string;
      phone?: string | null;
      role?: Role;
    },
    actorUserId?: string
  ) {
    const normalizedEmail = data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictError("A user with this email address already exists");
    }

    const assignedRole = data.role === Role.ADMIN ? Role.ADMIN : Role.STAFF;
    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: data.fullName.trim(),
        phone: data.phone || null,
        role: assignedRole,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "CREATE_STAFF_USER",
      entityType: "USER",
      entityId: user.id,
      afterData: user,
    });

    return user;
  }

  /**
   * List all users with pagination and search (ADMIN only).
   */
  static async getUsers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: Role;
    isActive?: boolean;
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.role) {
      where.role = params.role;
    }
    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: { id: true, companyName: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const pagination: PaginationParams = {
      page,
      pageSize,
      total,
    };

    return { users, pagination };
  }

  /**
   * Update user details.
   */
  static async updateUser(
    userId: string,
    data: { fullName?: string; phone?: string | null; isActive?: boolean },
    actorUserId?: string
  ) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    // Safety: Prevent deactivating the last admin
    if (existing.role === Role.ADMIN && data.isActive === false) {
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN, isActive: true },
      });
      if (adminCount <= 1) {
        throw new ValidationError("Cannot deactivate user: at least one active Admin must remain");
      }
    }

    // Safety: Prevent deactivating self
    if (actorUserId && existing.id === actorUserId && data.isActive === false) {
      throw new ValidationError("You cannot deactivate your own account");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "UPDATE_USER",
      entityType: "USER",
      entityId: userId,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  /**
   * Assign/change user role (ADMIN only).
   */
  static async updateUserRole(
    userId: string,
    newRole: Role,
    actorUserId?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    // Safety: Prevent removing the last admin
    if (user.role === Role.ADMIN && newRole !== Role.ADMIN) {
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN, isActive: true },
      });
      if (adminCount <= 1) {
        throw new ValidationError("Cannot change role: at least one active Admin must remain");
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "UPDATE_USER_ROLE",
      entityType: "USER",
      entityId: userId,
      beforeData: { role: user.role },
      afterData: { role: updated.role },
    });

    return updated;
  }

  /**
   * Delete user permanently (ADMIN only).
   */
  static async deleteUser(userId: string, actorUserId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    // Safety: Prevent self-deletion
    if (actorUserId && user.id === actorUserId) {
      throw new ValidationError("You cannot delete your own account");
    }

    // Safety: Prevent removing the last admin
    if (user.role === Role.ADMIN) {
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN, isActive: true },
      });
      if (adminCount <= 1) {
        throw new ValidationError("Cannot delete user: at least one active Admin must remain");
      }
    }

    // Create audit log before deletion
    await createAuditLog({
      actorUserId,
      action: "DELETE_USER",
      entityType: "USER",
      entityId: userId,
      beforeData: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
      },
      afterData: null,
    });

    // Revoke and delete user record (cascades tokens & notifications, sets customer/audit user null)
    await prisma.user.delete({
      where: { id: userId },
    });

    return {
      id: userId,
      email: user.email,
      fullName: user.fullName,
      deleted: true,
    };
  }
}
