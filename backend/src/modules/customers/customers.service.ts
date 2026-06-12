import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { UpdateCustomerDto } from './dtos/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { companyId_phone: { companyId, phone: dto.phone } },
    });
    if (existing) {
      throw new BadRequestException('Ya existe un cliente con ese teléfono');
    }

    return this.prisma.customer.create({
      data: {
        companyId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email || null,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.customer.findMany({
      where: { companyId },
      include: { _count: { select: { appointments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
      include: {
        appointments: {
          orderBy: { startTime: 'desc' },
          take: 20,
          include: { service: true },
        },
      },
    });
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return customer;
  }

  /** Used by the WhatsApp flow — scoped to the company that owns the number. */
  async findByPhone(companyId: string, phone: string) {
    return this.prisma.customer.findUnique({
      where: { companyId_phone: { companyId, phone } },
    });
  }

  /** Get existing customer by phone or create one (WhatsApp inbound). */
  async findOrCreateByPhone(companyId: string, phone: string, name: string) {
    const existing = await this.findByPhone(companyId, phone);
    if (existing) return existing;
    return this.prisma.customer.create({
      data: { companyId, phone, name: name || 'Cliente' },
    });
  }

  async update(companyId: string, id: string, dto: UpdateCustomerDto) {
    await this.findById(companyId, id); // ownership check
    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        phone: dto.phone ?? undefined,
        email: dto.email ?? undefined,
        notes: dto.notes ?? undefined,
        vip: dto.vip ?? undefined,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      },
    });
  }

  /** Rich CRM profile: visits, value, no-shows, frequency, history. */
  async getProfile(companyId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
      include: {
        appointments: {
          orderBy: { startTime: 'desc' },
          include: { service: true, staff: { select: { id: true, name: true } } },
        },
      },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    const appts = customer.appointments;
    const completed = appts.filter((a) => a.status === 'COMPLETED');
    const cancelled = appts.filter((a) => a.status === 'CANCELLED');
    const noShows = appts.filter((a) => a.status === 'NO_SHOW');
    const now = new Date();
    const upcoming = appts.filter(
      (a) =>
        new Date(a.startTime) > now &&
        (a.status === 'CONFIRMED' || a.status === 'PENDING'),
    );

    const lifetimeValue = completed.reduce((sum, a) => sum + (a.price ?? 0), 0);
    const lastVisit = completed[0]?.startTime ?? null;

    // Average days between completed visits.
    let frequencyDays: number | null = null;
    if (completed.length >= 2) {
      const sorted = [...completed].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
      const span =
        new Date(sorted[sorted.length - 1].startTime).getTime() -
        new Date(sorted[0].startTime).getTime();
      frequencyDays = Math.round(span / 86400000 / (completed.length - 1));
    }

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        notes: customer.notes,
        vip: customer.vip,
        birthday: customer.birthday,
        createdAt: customer.createdAt,
      },
      stats: {
        totalAppointments: appts.length,
        completed: completed.length,
        cancelled: cancelled.length,
        noShows: noShows.length,
        lateCancellations: customer.lateCancellations,
        lifetimeValue,
        lastVisit,
        frequencyDays,
        upcoming: upcoming.length,
      },
      history: appts.slice(0, 30),
    };
  }

  async delete(companyId: string, id: string) {
    await this.findById(companyId, id); // ownership check
    await this.prisma.customer.delete({ where: { id } });
    return { message: 'Cliente eliminado' };
  }

  async getCustomerHistory(companyId: string, id: string) {
    const customer = await this.findById(companyId, id);
    return {
      customer,
      appointments: customer.appointments,
      totalAppointments: customer.appointments.length,
    };
  }
}
