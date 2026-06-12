import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateServiceDto } from './dtos/create-service.dto';
import {
  UpdateServiceDto,
  SetServiceResourcesDto,
} from './dtos/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description ?? null,
        categoryId: dto.categoryId ?? null,
        price: dto.price ?? 0,
        duration: dto.duration,
        prepTime: dto.prepTime ?? 0,
        cleanupTime: dto.cleanupTime ?? 0,
        buffer: dto.buffer ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async findAll(companyId: string, onlyActive = false) {
    return this.prisma.service.findMany({
      where: { companyId, ...(onlyActive ? { active: true } : {}) },
      include: {
        category: true,
        resources: { include: { resource: true } },
        _count: { select: { staff: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, companyId },
      include: {
        category: true,
        resources: { include: { resource: true } },
        staff: { include: { staff: { select: { id: true, name: true } } } },
      },
    });
    if (!service) throw new NotFoundException('Servicio no encontrado');
    return service;
  }

  async update(companyId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(companyId, id);
    return this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        description: dto.description ?? undefined,
        categoryId: dto.categoryId ?? undefined,
        price: dto.price ?? undefined,
        duration: dto.duration ?? undefined,
        prepTime: dto.prepTime ?? undefined,
        cleanupTime: dto.cleanupTime ?? undefined,
        buffer: dto.buffer ?? undefined,
        active: dto.active ?? undefined,
      },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.service.delete({ where: { id } });
    return { message: 'Servicio eliminado' };
  }

  // ── Required resources ──
  async setResources(
    companyId: string,
    id: string,
    dto: SetServiceResourcesDto,
  ) {
    await this.findOne(companyId, id);
    const validIds = (
      await this.prisma.resource.findMany({
        where: { companyId, id: { in: dto.resources.map((r) => r.resourceId) } },
        select: { id: true },
      })
    ).map((r) => r.id);

    await this.prisma.$transaction([
      this.prisma.serviceResource.deleteMany({ where: { serviceId: id } }),
      this.prisma.serviceResource.createMany({
        data: dto.resources
          .filter((r) => validIds.includes(r.resourceId))
          .map((r) => ({
            serviceId: id,
            resourceId: r.resourceId,
            quantity: r.quantity ?? 1,
          })),
      }),
    ]);
    return this.findOne(companyId, id);
  }
}
