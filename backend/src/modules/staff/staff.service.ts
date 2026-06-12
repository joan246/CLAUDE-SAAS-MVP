import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  SetStaffScheduleDto,
  CreateTimeOffDto,
  SetStaffServicesDto,
} from './dtos/staff.dto';
import { TimeOffType } from '@prisma/client';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  // ── CRUD ──
  async create(companyId: string, dto: CreateStaffDto) {
    const staff = await this.prisma.staff.create({
      data: {
        companyId,
        name: dto.name,
        photo: dto.photo ?? null,
        title: dto.title ?? null,
        bio: dto.bio ?? null,
        active: dto.active ?? true,
        priority: dto.priority ?? 0,
        simultaneousCapacity: dto.simultaneousCapacity ?? 1,
        // default schedule: Mon–Fri 09–18
        schedule: {
          create: Array.from({ length: 7 }).map((_, dayOfWeek) => ({
            dayOfWeek,
            isWorking: dayOfWeek >= 1 && dayOfWeek <= 5,
            startTime: '09:00',
            endTime: '18:00',
          })),
        },
      },
      include: { schedule: { orderBy: { dayOfWeek: 'asc' } } },
    });
    return staff;
  }

  async findAll(companyId: string) {
    return this.prisma.staff.findMany({
      where: { companyId },
      include: {
        services: { include: { service: { select: { id: true, name: true } } } },
        _count: { select: { appointments: true } },
      },
      orderBy: [{ active: 'desc' }, { priority: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(companyId: string, id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, companyId },
      include: {
        schedule: { orderBy: { dayOfWeek: 'asc' } },
        timeOff: { orderBy: { start: 'desc' } },
        services: { include: { service: { select: { id: true, name: true } } } },
      },
    });
    if (!staff) throw new NotFoundException('Empleado no encontrado');
    return staff;
  }

  async update(companyId: string, id: string, dto: UpdateStaffDto) {
    await this.findOne(companyId, id);
    return this.prisma.staff.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        photo: dto.photo ?? undefined,
        title: dto.title ?? undefined,
        bio: dto.bio ?? undefined,
        active: dto.active ?? undefined,
        priority: dto.priority ?? undefined,
        simultaneousCapacity: dto.simultaneousCapacity ?? undefined,
      },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.staff.delete({ where: { id } });
    return { message: 'Empleado eliminado' };
  }

  // ── Weekly schedule ──
  async getSchedule(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.staffSchedule.findMany({
      where: { staffId: id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async setSchedule(companyId: string, id: string, dto: SetStaffScheduleDto) {
    await this.findOne(companyId, id);
    await this.prisma.$transaction(
      dto.days.map((d) =>
        this.prisma.staffSchedule.upsert({
          where: { staffId_dayOfWeek: { staffId: id, dayOfWeek: d.dayOfWeek } },
          create: {
            staffId: id,
            dayOfWeek: d.dayOfWeek,
            isWorking: d.isWorking,
            startTime: d.startTime,
            endTime: d.endTime,
          },
          update: {
            isWorking: d.isWorking,
            startTime: d.startTime,
            endTime: d.endTime,
          },
        }),
      ),
    );
    return this.getSchedule(companyId, id);
  }

  // ── Time off ──
  async listTimeOff(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.staffTimeOff.findMany({
      where: { staffId: id },
      orderBy: { start: 'desc' },
    });
  }

  async addTimeOff(companyId: string, id: string, dto: CreateTimeOffDto) {
    await this.findOne(companyId, id);
    return this.prisma.staffTimeOff.create({
      data: {
        staffId: id,
        type: dto.type as TimeOffType,
        start: new Date(dto.start),
        end: new Date(dto.end),
        allDay: dto.allDay ?? true,
        reason: dto.reason ?? null,
      },
    });
  }

  async removeTimeOff(companyId: string, id: string, timeOffId: string) {
    await this.findOne(companyId, id);
    await this.prisma.staffTimeOff.deleteMany({
      where: { id: timeOffId, staffId: id },
    });
    return { message: 'Ausencia eliminada' };
  }

  // ── Specialties (servicios permitidos) ──
  async getServices(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.staffService.findMany({
      where: { staffId: id },
      include: { service: true },
    });
  }

  async setServices(companyId: string, id: string, dto: SetStaffServicesDto) {
    await this.findOne(companyId, id);
    // Validate all services belong to the company.
    const validIds = (
      await this.prisma.service.findMany({
        where: { companyId, id: { in: dto.services.map((s) => s.serviceId) } },
        select: { id: true },
      })
    ).map((s) => s.id);

    await this.prisma.$transaction([
      this.prisma.staffService.deleteMany({ where: { staffId: id } }),
      this.prisma.staffService.createMany({
        data: dto.services
          .filter((s) => validIds.includes(s.serviceId))
          .map((s) => ({
            staffId: id,
            serviceId: s.serviceId,
            avgDuration: s.avgDuration ?? null,
          })),
      }),
    ]);
    return this.getServices(companyId, id);
  }
}
