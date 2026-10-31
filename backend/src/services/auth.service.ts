import { prisma } from "../database/prisma";
import { Role } from "@sms/shared";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateOpaqueToken,
  hashOpaqueToken,
} from "../utils/token";
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors";
import { createAuditLog } from "./audit.service";
import { emailService } from "./email/email.service";

const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(
  process.env.REFRESH_TOKEN_EXPIRY_DAYS || "7",
  10
);

export class AuthService {
  /**
   * Register a new customer account atomically in a transaction.
   * Public registration always enforces CUSTOMER role.
   */
  static async register(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string | null;
    companyName?: string | null;
  }) {
    const normalizedEmail = data.email.toLowerCase().trim();

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictError("An account with this email address already exists");
    }

    const passwordHash = await hashPassword(data.password);

    // Atomic transaction creating User and linked Customer
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName: data.fullName.trim(),
          phone: data.phone || null,
          role: Role.CUSTOMER,
          isActive: true,
        },
      });

      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          email: normalizedEmail,
          fullName: data.fullName.trim(),
          phone: data.phone || null,
          companyName: data.companyName || null,
          currency: "INR",
          country: "India",
          isActive: true,
        },
      });

      return { user, customer };
    });

    await createAuditLog({
      actorUserId: result.user.id,
      action: "REGISTER_CUSTOMER",
      entityType: "USER",
      entityId: result.user.id,
      afterData: {
        userId: result.user.id,
        customerId: result.customer.id,
        email: result.user.email,
        role: result.user.role,
      },
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
      },
      customer: {
        id: result.customer.id,
        companyName: result.customer.companyName,
      },
    };
  }

  /**
   * Authenticate user with credentials and issue access token + opaque refresh token.
   */
  static async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { customer: { select: { id: true } } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Generate JWT access token
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as unknown as Role,
    });

    // Generate opaque refresh token
    const { rawToken, tokenHash } = generateOpaqueToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await createAuditLog({
      actorUserId: user.id,
      action: "LOGIN",
      entityType: "USER",
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      rawRefreshToken: rawToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        customerId: user.customer?.id,
      },
    };
  }

  /**
   * Rotate refresh token: revoke old token and issue new pair.
   */
  static async refreshToken(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedError("Refresh token is required");
    }

    const tokenHash = hashOpaqueToken(rawRefreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { customer: { select: { id: true } } },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    if (storedToken.isRevoked) {
      // Possible token reuse attack detected: invalidate all sessions for this user
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedError("Revoked refresh token detected: session invalidated");
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedError("Refresh token has expired");
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedError("Account is inactive");
    }

    // Generate new pair and rotate atomically
    const { rawToken: newRawRefreshToken, tokenHash: newTokenHash } = generateOpaqueToken();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.$transaction(async (tx) => {
      // Revoke old token
      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          isRevoked: true,
        },
      });

      // Insert new token
      await tx.refreshToken.create({
        data: {
          userId: storedToken.user.id,
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt,
        },
      });
    });

    const newAccessToken = generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role as unknown as Role,
    });

    return {
      accessToken: newAccessToken,
      rawRefreshToken: newRawRefreshToken,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        fullName: storedToken.user.fullName,
        role: storedToken.user.role as unknown as Role,
        customerId: storedToken.user.customer?.id,
      },
    };
  }

  /**
   * Logout user by revoking the specific refresh token.
   */
  static async logout(rawRefreshToken?: string) {
    if (!rawRefreshToken) return;

    const tokenHash = hashOpaqueToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  }

  /**
   * Request password reset token.
   */
  static async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Return gracefully to prevent user enumeration attacks
      return { message: "If an account with that email exists, a password reset link has been generated." };
    }

    const { rawToken, tokenHash } = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${rawToken}`;

    // Dispatch via email service adapter
    try {
      await emailService.sendPasswordResetEmail({
        to: user.email,
        userName: user.fullName,
        resetUrl,
        expiresAtMinutes: 60,
      });
    } catch (emailErr) {
      console.warn("[AuthService] Password reset email transmission failed:", emailErr);
    }

    return {
      message: "If an account with that email exists, a password reset link has been generated.",
      resetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    };
  }

  /**
   * Reset password using token.
   */
  static async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashOpaqueToken(token);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.isUsed) {
      throw new ValidationError("Password reset link is invalid or has already been used");
    }

    if (new Date() > resetRecord.expiresAt) {
      throw new ValidationError("Password reset link has expired");
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      // Mark token as used
      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { isUsed: true },
      });

      // Update password
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      });

      // Invalidate all existing refresh tokens for security
      await tx.refreshToken.updateMany({
        where: { userId: resetRecord.userId },
        data: { isRevoked: true },
      });
    });

    await createAuditLog({
      actorUserId: resetRecord.userId,
      action: "RESET_PASSWORD",
      entityType: "USER",
      entityId: resetRecord.userId,
    });

    return { message: "Password has been successfully updated" };
  }
}
