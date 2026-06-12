import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { UpdateBusinessHoursDto } from './dtos/business-hours.dto';
import { UpdateAiConfigDto } from './dtos/ai-config.dto';
import { UpdateCancellationPolicyDto } from './dtos/cancellation-policy.dto';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  // ── Profile ────────────────────────────────────────────────────────────
  async getProfile(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        businessHours: { orderBy: { dayOfWeek: 'asc' } },
        aiConfig: true,
        cancellationPolicy: true,
        googleCalendar: { select: { email: true, calendarId: true } },
      },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    // Never leak secrets to the client.
    const { whatsappAccessToken, ...safe } = company as any;
    return {
      ...safe,
      whatsappConnected: !!whatsappAccessToken,
      googleConnected: !!company.googleCalendar,
    };
  }

  async updateProfile(companyId: string, dto: UpdateCompanyDto) {
    await this.ensureCompany(companyId);
    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        name: dto.name ?? undefined,
        logo: dto.logo ?? undefined,
        address: dto.address ?? undefined,
        phone: dto.phone ?? undefined,
        email: dto.email ?? undefined,
        timezone: dto.timezone ?? undefined,
        whatsappPhoneNumberId: dto.whatsappPhoneNumberId ?? undefined,
        whatsappAccessToken: dto.whatsappAccessToken ?? undefined,
        whatsappVerifyToken: dto.whatsappVerifyToken ?? undefined,
      },
    });
  }

  // ── Business hours ─────────────────────────────────────────────────────
  async getBusinessHours(companyId: string) {
    return this.prisma.businessHours.findMany({
      where: { companyId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async updateBusinessHours(companyId: string, dto: UpdateBusinessHoursDto) {
    await this.ensureCompany(companyId);
    // Upsert each weekday in a single transaction.
    await this.prisma.$transaction(
      dto.hours.map((h) =>
        this.prisma.businessHours.upsert({
          where: { companyId_dayOfWeek: { companyId, dayOfWeek: h.dayOfWeek } },
          create: {
            companyId,
            dayOfWeek: h.dayOfWeek,
            isOpen: h.isOpen,
            startTime: h.startTime,
            endTime: h.endTime,
          },
          update: {
            isOpen: h.isOpen,
            startTime: h.startTime,
            endTime: h.endTime,
          },
        }),
      ),
    );
    return this.getBusinessHours(companyId);
  }

  // ── AI config ──────────────────────────────────────────────────────────
  async getAiConfig(companyId: string) {
    const config = await this.prisma.aiConfig.findUnique({
      where: { companyId },
    });
    // Auto-heal if missing (e.g. older tenants).
    if (!config) {
      return this.prisma.aiConfig.create({ data: { companyId } });
    }
    return config;
  }

  async updateAiConfig(companyId: string, dto: UpdateAiConfigDto) {
    await this.getAiConfig(companyId); // ensures it exists
    return this.prisma.aiConfig.update({
      where: { companyId },
      data: {
        enabled: dto.enabled ?? undefined,
        personality: dto.personality ?? undefined,
        tone: dto.tone ?? undefined,
        rules: dto.rules ?? undefined,
        greeting: dto.greeting ?? undefined,
        customSystemPrompt: dto.customSystemPrompt ?? undefined,
      },
    });
  }

  // ── Knowledge Base ─────────────────────────────────────────────────────
  async getKnowledgeDocuments(companyId: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addKnowledgeDocument(companyId: string, title: string, content: string) {
    await this.ensureCompany(companyId);
    return this.prisma.knowledgeDocument.create({
      data: { companyId, title, content },
    });
  }

  async deleteKnowledgeDocument(companyId: string, documentId: string) {
    // Verificar propiedad
    const doc = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, companyId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return this.prisma.knowledgeDocument.delete({
      where: { id: documentId },
    });
  }

  // ── Cancellation policy ────────────────────────────────────────────────
  async getCancellationPolicy(companyId: string) {
    const policy = await this.prisma.cancellationPolicy.findUnique({
      where: { companyId },
    });
    if (!policy) {
      return this.prisma.cancellationPolicy.create({ data: { companyId } });
    }
    return policy;
  }

  async updateCancellationPolicy(
    companyId: string,
    dto: UpdateCancellationPolicyDto,
  ) {
    await this.getCancellationPolicy(companyId);
    return this.prisma.cancellationPolicy.update({
      where: { companyId },
      data: {
        minHoursBefore: dto.minHoursBefore ?? undefined,
        warningThreshold: dto.warningThreshold ?? undefined,
        warningMessage: dto.warningMessage ?? undefined,
        penaltyMessage: dto.penaltyMessage ?? undefined,
      },
    });
  }

  private async ensureCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
  }
}
