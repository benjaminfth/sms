import { prisma } from "../database/prisma";
import { NotFoundError } from "../utils/errors";
import { PaginationParams } from "../utils/response";
import { QuotationTemplateConfig, PaymentTerms, TemplateLineConfig } from "@sms/shared";

export class QuotationTemplateService {
  /**
   * Helper to parse stored template configuration from description field.
   */
  static parseTemplate(template: any) {
    if (!template) return template;

    let config: QuotationTemplateConfig = {
      validityDays: 15,
      paymentTerms: "NET_15",
      termsAndConditions: "",
      lines: [],
    };
    let cleanDescription = template.description || "";

    if (template.description && template.description.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(template.description);
        cleanDescription = parsed.summary || parsed.description || "";
        config = {
          validityDays: parsed.validityDays ?? 15,
          paymentTerms: parsed.paymentTerms ?? "NET_15",
          termsAndConditions: parsed.termsAndConditions ?? "",
          planId: parsed.planId ?? null,
          lines: parsed.lines ?? [],
        };
      } catch {
        // Use default config if JSON parsing fails
      }
    }

    return {
      ...template,
      description: cleanDescription,
      config,
    };
  }

  /**
   * Encodes template configuration and summary into description string for Prisma.
   */
  static encodeDescription(
    summary?: string | null,
    config?: QuotationTemplateConfig
  ): string {
    const payload = {
      summary: summary || "",
      validityDays: config?.validityDays ?? 15,
      paymentTerms: config?.paymentTerms ?? "NET_15",
      termsAndConditions: config?.termsAndConditions ?? "",
      planId: config?.planId ?? null,
      lines: config?.lines ?? [],
    };
    return JSON.stringify(payload);
  }

  static async createTemplate(data: {
    name: string;
    description?: string | null;
    validityDays?: number;
    paymentTerms?: PaymentTerms;
    termsAndConditions?: string | null;
    planId?: string | null;
    lines?: TemplateLineConfig[];
    isActive?: boolean;
  }) {
    const config: QuotationTemplateConfig = {
      validityDays: data.validityDays ?? 15,
      paymentTerms: data.paymentTerms ?? "NET_15",
      termsAndConditions: data.termsAndConditions || "",
      planId: data.planId || null,
      lines: data.lines || [],
    };

    const encoded = this.encodeDescription(data.description, config);

    const created = await prisma.quotationTemplate.create({
      data: {
        name: data.name,
        description: encoded,
        isActive: data.isActive ?? true,
      },
    });

    return this.parseTemplate(created);
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

    const [rawTemplates, total] = await Promise.all([
      prisma.quotationTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.quotationTemplate.count({ where }),
    ]);

    const templates = rawTemplates.map((t) => this.parseTemplate(t));
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
    return this.parseTemplate(template);
  }

  static async updateTemplate(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      validityDays?: number;
      paymentTerms?: PaymentTerms;
      termsAndConditions?: string | null;
      planId?: string | null;
      lines?: TemplateLineConfig[];
      isActive?: boolean;
    }
  ) {
    const existing = await this.getTemplateById(id);

    const config: QuotationTemplateConfig = {
      validityDays: data.validityDays ?? existing.config?.validityDays ?? 15,
      paymentTerms: data.paymentTerms ?? existing.config?.paymentTerms ?? "NET_15",
      termsAndConditions:
        data.termsAndConditions !== undefined
          ? data.termsAndConditions || ""
          : existing.config?.termsAndConditions || "",
      planId:
        data.planId !== undefined ? data.planId : existing.config?.planId || null,
      lines: data.lines !== undefined ? data.lines : existing.config?.lines || [],
    };

    const summary = data.description !== undefined ? data.description : existing.description;
    const encoded = this.encodeDescription(summary, config);

    const updated = await prisma.quotationTemplate.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        description: encoded,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      },
    });

    return this.parseTemplate(updated);
  }

  static async deleteTemplate(id: string) {
    await this.getTemplateById(id);
    return prisma.quotationTemplate.delete({
      where: { id },
    });
  }
}
