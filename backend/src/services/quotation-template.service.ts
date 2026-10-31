import { prisma } from "../database/prisma";
import { NotFoundError } from "../utils/errors";
import { createAuditLog } from "./audit.service";
import { PaginationParams } from "../utils/response";

export class QuotationTemplateService {
  static async listTemplates(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [total, templates] = await Promise.all([
      prisma.quotationTemplate.count({ where }),
      prisma.quotationTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const pagination: PaginationParams = {
      page,
      pageSize,
      total,
    };

    return { templates, pagination };
  }

  static async getTemplateById(id: string) {
    const template = await prisma.quotationTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundError(`Quotation template with ID '${id}' not found`);
    }
    return template;
  }

  static async createTemplate(
    data: { name: string; description?: string | null; isActive?: boolean },
    actorUserId?: string
  ) {
    const template = await prisma.quotationTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    await createAuditLog({
      actorUserId,
      action: "CREATE_QUOTATION_TEMPLATE",
      entityType: "QUOTATION_TEMPLATE",
      entityId: template.id,
      afterData: template,
    });

    return template;
  }

  static async updateTemplate(
    id: string,
    data: { name?: string; description?: string | null; isActive?: boolean },
    actorUserId?: string
  ) {
    const existing = await QuotationTemplateService.getTemplateById(id);

    const updated = await prisma.quotationTemplate.update({
      where: { id },
      data,
    });

    await createAuditLog({
      actorUserId,
      action: "UPDATE_QUOTATION_TEMPLATE",
      entityType: "QUOTATION_TEMPLATE",
      entityId: id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  static async deleteTemplate(id: string, actorUserId?: string) {
    const existing = await QuotationTemplateService.getTemplateById(id);

    await prisma.quotationTemplate.delete({
      where: { id },
    });

    await createAuditLog({
      actorUserId,
      action: "DELETE_QUOTATION_TEMPLATE",
      entityType: "QUOTATION_TEMPLATE",
      entityId: id,
      beforeData: existing,
    });

    return { message: "Quotation template deleted successfully" };
  }
}

