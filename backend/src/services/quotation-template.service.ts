import { prisma } from "../database/prisma";
import { NotFoundError } from "../utils/errors";
import { PaginationParams } from "../utils/response";

export class QuotationTemplateService {
  static async createTemplate(data: {
    name: string;
    description?: string | null;
    isActive?: boolean;
  }) {
    return prisma.quotationTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
      },
    });
  }

  static async getTemplates(query: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.search) {
      where.name = { contains: query.search, mode: "insensitive" };
    }

    const [templates, total] = await Promise.all([
      prisma.quotationTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.quotationTemplate.count({ where }),
    ]);

    const pagination: PaginationParams = { page, pageSize, total };
    return { templates, pagination };
  }

  static async getTemplateById(id: string) {
    const template = await prisma.quotationTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundError("Quotation template not found");
    }
    return template;
  }

  static async updateTemplate(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    }
  ) {
    await this.getTemplateById(id);
    return prisma.quotationTemplate.update({
      where: { id },
      data,
    });
  }

  static async deleteTemplate(id: string) {
    await this.getTemplateById(id);
    return prisma.quotationTemplate.delete({
      where: { id },
    });
  }
}

