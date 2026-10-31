import { prisma } from "../database/prisma";
import { CreateAuditLogInput } from "@sms/shared";

export async function createAuditLog(input: CreateAuditLogInput) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId || null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeData: input.beforeData as any,
        afterData: input.afterData as any,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });
  } catch (err) {
    // Audit logging should not crash the primary operational transaction, but should log errors
    console.error("Failed to create audit log entry:", err);
    return null;
  }
}
