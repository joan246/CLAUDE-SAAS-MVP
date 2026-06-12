import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAppointmentDto } from './dtos/create-appointment.dto';
import { UpdateAppointmentDto } from './dtos/update-appointment.dto';
import { AppointmentStatus } from '@prisma/client';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { SchedulingService, SlotOption } from './scheduling.service';
import { RulesService } from '../rules/rules.module';
import { localToUtc, utcToLocalDateStr } from 'src/common/timezone';

const ACTIVE_STATUSES = [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING];

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private googleCalendar: GoogleCalendarService,
    private scheduling: SchedulingService,
    private rules: RulesService,
  ) {}

  // ─────────────────────────────── CREATE ───────────────────────────────
  async create(companyId: string, dto: CreateAppointmentDto) {
    let customerId = dto.customerId;

    // Auto-create or resolve customer if no ID but phone is provided
    if (!customerId && dto.customerPhone && dto.customerName) {
      let customer = await this.prisma.customer.findFirst({
        where: { companyId, phone: dto.customerPhone },
      });
      if (!customer) {
        customer = await this.prisma.customer.create({
          data: {
            companyId,
            name: dto.customerName,
            phone: dto.customerPhone,
          },
        });
      }
      customerId = customer.id;
    }

    if (!customerId) {
      throw new BadRequestException('Se requiere customerId o customerName/customerPhone');
    }

    // Force interaction update (last interaction)
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: { updatedAt: new Date() },
    });

    if (customer.companyId !== companyId) {
      throw new NotFoundException('Cliente no encontrado en esta empresa');
    }

    const service = dto.serviceId
      ? await this.prisma.service.findFirst({
          where: { id: dto.serviceId, companyId },
          include: { resources: true, staff: true },
        })
      : null;
    if (dto.serviceId && !service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const start = new Date(dto.startTime);
    if (isNaN(start.getTime())) throw new BadRequestException('Fecha/hora inválida');

    // Configurable business rules (e.g. no same-day, min hours, max cancellations).
    await this.rules.assertBookingAllowed(companyId, start, customer);

    // Effective duration (honor per-staff avgDuration when a staff is requested).
    let duration = service?.duration ?? 60;
    if (service && dto.staffId) {
      const ss = service.staff.find((s) => s.staffId === dto.staffId);
      if (ss?.avgDuration) duration = ss.avgDuration;
    }
    const block =
      duration + (service?.prepTime ?? 0) + (service?.cleanupTime ?? 0);
    const end = new Date(start.getTime() + block * 60000);

    // Staff assignment: use the engine when the company has eligible staff.
    let staffId: string | null = null;
    const eligibleCount = service
      ? await this.prisma.staffService.count({
          where: { serviceId: service.id, staff: { companyId, active: true } },
        })
      : 0;

    if (service && eligibleCount > 0) {
      staffId = await this.scheduling.assignStaff(
        companyId,
        service.id,
        start,
        end,
        dto.staffId,
      );
      if (!staffId) {
        throw new BadRequestException(
          'No hay personal disponible para ese horario',
        );
      }
    } else {
      // Solo-operator fallback: company hours + simple conflict + resources.
      await this.assertWithinBusinessHours(companyId, start, end);
      await this.assertNoConflict(companyId, start, end);
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        companyId,
        customerId: dto.customerId,
        serviceId: dto.serviceId ?? null,
        staffId,
        startTime: start,
        endTime: end,
        status: AppointmentStatus.CONFIRMED,
        price: service?.price ?? null,
        notes: dto.notes ?? null,
        resources: service?.resources.length
          ? {
              create: service.resources.map((r) => ({
                resourceId: r.resourceId,
                quantity: r.quantity,
              })),
            }
          : undefined,
      },
      include: { customer: true, service: true, staff: true },
    });

    await this.createReminders(appointment.id);
    await this.syncCreateToGoogle(companyId, appointment.id);
    return appointment;
  }

  // ── conflict / hours helpers (solo-operator fallback) ──
  private async assertNoConflict(
    companyId: string,
    start: Date,
    end: Date,
    ignoreId?: string,
  ) {
    const conflicting = await this.prisma.appointment.findFirst({
      where: {
        companyId,
        id: ignoreId ? { not: ignoreId } : undefined,
        status: { in: ACTIVE_STATUSES },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });
    if (conflicting) throw new BadRequestException('Ese horario ya no está disponible');
  }

  private async assertWithinBusinessHours(companyId: string, start: Date, end: Date) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true },
    });
    const timezone = company?.timezone || 'America/Mexico_City';

    const dateStr = utcToLocalDateStr(start, timezone);
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

    const bh = await this.prisma.businessHours.findUnique({
      where: { companyId_dayOfWeek: { companyId, dayOfWeek } },
    });
    if (!bh || !bh.isOpen) throw new BadRequestException('El negocio está cerrado ese día');

    const open = localToUtc(dateStr, bh.startTime, timezone);
    const close = localToUtc(dateStr, bh.endTime, timezone);
    if (start < open || end > close) {
      throw new BadRequestException(`El horario debe estar entre ${bh.startTime} y ${bh.endTime}`);
    }
  }

  // ─────────────────────────────── REMINDERS ───────────────────────────────
  async createReminders(appointmentId: string) {
    await this.prisma.reminder.createMany({
      data: [24, 1].map((hours) => ({
        appointmentId,
        hoursBeforeAppointment: hours,
      })),
    });
  }

  // ─────────────────────────────── QUERIES ───────────────────────────────
  async findAll(companyId: string, opts?: { from?: Date; to?: Date; staffId?: string }) {
    return this.prisma.appointment.findMany({
      where: {
        companyId,
        ...(opts?.staffId ? { staffId: opts.staffId } : {}),
        ...(opts?.from || opts?.to
          ? { startTime: { gte: opts?.from, lte: opts?.to } }
          : {}),
      },
      include: { customer: true, service: true, staff: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, companyId },
      include: { customer: true, service: true, staff: true, resources: { include: { resource: true } } },
    });
    if (!appointment) throw new NotFoundException('Cita no encontrada');
    return appointment;
  }

  async getTodayAppointments(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true },
    });
    const timezone = company?.timezone || 'America/Mexico_City';
    
    const now = new Date();
    const localDateStr = utcToLocalDateStr(now, timezone);
    const dayStart = localToUtc(localDateStr, '00:00', timezone);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);

    return this.prisma.appointment.findMany({
      where: { companyId, startTime: { gte: dayStart, lt: dayEnd } },
      include: { customer: true, service: true, staff: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async getUpcomingAppointments(companyId: string) {
    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);
    return this.prisma.appointment.findMany({
      where: {
        companyId,
        startTime: { gte: now, lte: in7Days },
        status: { in: ACTIVE_STATUSES },
      },
      include: { customer: true, service: true, staff: true },
      orderBy: { startTime: 'asc' },
    });
  }

  // ─────────────────────────────── AVAILABILITY ───────────────────────────────
  /** Rich availability (slots + eligible staff) for the multi-staff UI / agent. */
  async getAvailability(
    companyId: string,
    serviceId: string,
    date: Date,
    staffId?: string,
  ): Promise<SlotOption[]> {
    const eligibleCount = await this.prisma.staffService.count({
      where: { serviceId, staff: { companyId, active: true } },
    });
    if (eligibleCount > 0) {
      return this.scheduling.getAvailability(companyId, serviceId, date, staffId);
    }
    // Solo-operator fallback → slots with no staff attached.
    return this.soloAvailability(companyId, serviceId, date);
  }

  /** Backward-compatible: just the available start times (ISO strings). */
  async getAvailableSlots(
    companyId: string,
    date: Date,
    serviceId?: string,
  ): Promise<string[]> {
    if (!serviceId) {
      const fallback = await this.prisma.service.findFirst({
        where: { companyId, active: true },
        orderBy: { duration: 'asc' },
      });
      if (!fallback) return [];
      serviceId = fallback.id;
    }
    const slots = await this.getAvailability(companyId, serviceId, date);
    return slots.map((s) => s.time);
  }

  private async soloAvailability(
    companyId: string,
    serviceId: string,
    date: Date,
  ): Promise<SlotOption[]> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, companyId },
    });
    if (!service) return [];

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true },
    });
    const timezone = company?.timezone || 'America/Mexico_City';

    const dateStr = date.toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

    const bh = await this.prisma.businessHours.findUnique({
      where: { companyId_dayOfWeek: { companyId, dayOfWeek } },
    });
    if (!bh || !bh.isOpen) return [];

    const block = service.duration + service.prepTime + service.cleanupTime;
    const step = block + service.buffer;
    const dayStart = localToUtc(dateStr, bh.startTime, timezone);
    const dayEnd = localToUtc(dateStr, bh.endTime, timezone);
    const now = new Date();

    const existing = await this.prisma.appointment.findMany({
      where: {
        companyId,
        status: { in: ACTIVE_STATUSES },
        startTime: { gte: dayStart, lt: dayEnd },
      },
    });

    const slots: SlotOption[] = [];
    const toMinutes = (hhmm: string): number => {
      const [h, min] = hhmm.split(':').map(Number);
      return h * 60 + min;
    };
    const startMin = toMinutes(bh.startTime);
    const endMin = toMinutes(bh.endTime);

    let curMin = startMin;
    while (curMin + block <= endMin) {
      const hStr = Math.floor(curMin / 60).toString().padStart(2, '0');
      const mStr = (curMin % 60).toString().padStart(2, '0');
      const cur = localToUtc(dateStr, `${hStr}:${mStr}`, timezone);
      const end = new Date(cur.getTime() + block * 60000);

      const conflict = existing.some(
        (a) => cur < new Date(a.endTime) && end > new Date(a.startTime),
      );
      if (!conflict && cur > now) slots.push({ time: cur.toISOString(), staff: [] });
      curMin += step;
    }
    return slots;
  }

  // ─────────────────────────────── UPDATE ───────────────────────────────
  async update(companyId: string, id: string, dto: UpdateAppointmentDto) {
    const appointment = await this.findOne(companyId, id);
    const nextStatus = (dto.status as AppointmentStatus) || appointment.status;

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: nextStatus,
        staffId: dto.staffId !== undefined ? dto.staffId : appointment.staffId,
        notes: dto.notes !== undefined ? dto.notes : appointment.notes,
      },
      include: { customer: true, service: true, staff: true },
    });

    if (nextStatus === AppointmentStatus.NO_SHOW) {
      await this.prisma.customer.update({
        where: { id: appointment.customerId },
        data: { noShows: { increment: 1 } },
      });
    }
    if (nextStatus === AppointmentStatus.CANCELLED && appointment.googleEventId) {
      await this.googleCalendar.deleteEvent(companyId, appointment.googleEventId);
    }
    return updated;
  }

  // ─────────────────────────────── RESCHEDULE ───────────────────────────────
  async reschedule(companyId: string, id: string, newStart: Date) {
    const appointment = await this.findOne(companyId, id);
    const durationMs =
      new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);

    if (appointment.serviceId && appointment.staffId) {
      const staffId = await this.scheduling.assignStaff(
        companyId,
        appointment.serviceId,
        newStart,
        newEnd,
        appointment.staffId,
      );
      if (!staffId) throw new BadRequestException('No hay disponibilidad en ese horario');
    } else {
      await this.assertWithinBusinessHours(companyId, newStart, newEnd);
      await this.assertNoConflict(companyId, newStart, newEnd, id);
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { startTime: newStart, endTime: newEnd },
      include: { customer: true, service: true, staff: true },
    });

    await this.prisma.reminder.deleteMany({ where: { appointmentId: id } });
    await this.createReminders(id);

    if (appointment.googleEventId) {
      await this.googleCalendar.updateEvent(companyId, appointment.googleEventId, {
        summary: `Cita: ${updated.customer.name}`,
        description: updated.notes ?? undefined,
        start: newStart,
        end: newEnd,
      });
    }
    return updated;
  }

  // ─────────────────────────────── CANCEL (policy) ───────────────────────────────
  async cancel(companyId: string, id: string) {
    const appointment = await this.findOne(companyId, id);
    const policy = await this.prisma.cancellationPolicy.findUnique({
      where: { companyId },
    });

    const hoursUntil =
      (new Date(appointment.startTime).getTime() - Date.now()) / (3600 * 1000);
    const minHours = policy?.minHoursBefore ?? 24;
    const isLate = hoursUntil < minHours;
    let policyMessage: string | null = null;

    if (isLate) {
      const customer = await this.prisma.customer.update({
        where: { id: appointment.customerId },
        data: { lateCancellations: { increment: 1 } },
      });
      const threshold = policy?.warningThreshold ?? 1;
      policyMessage =
        customer.lateCancellations > threshold
          ? policy?.penaltyMessage ?? null
          : policy?.warningMessage ?? null;
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
      include: { customer: true, service: true, staff: true },
    });

    if (appointment.googleEventId) {
      await this.googleCalendar.deleteEvent(companyId, appointment.googleEventId);
    }
    return { appointment: updated, late: isLate, policyMessage };
  }

  // ─────────────────────────────── DELETE ───────────────────────────────
  async delete(companyId: string, id: string) {
    const appointment = await this.findOne(companyId, id);
    if (appointment.googleEventId) {
      await this.googleCalendar.deleteEvent(companyId, appointment.googleEventId);
    }
    await this.prisma.appointment.delete({ where: { id } });
    return { message: 'Cita eliminada' };
  }

  // ─────────────────────────────── GOOGLE SYNC (dormant) ───────────────────────────────
  private async syncCreateToGoogle(companyId: string, appointmentId: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { customer: true, service: true, company: true },
    });
    if (!appt) return;
    const eventId = await this.googleCalendar.createEvent(companyId, {
      summary: `${appt.service?.name ?? 'Cita'}: ${appt.customer.name}`,
      description: appt.notes ?? undefined,
      start: appt.startTime,
      end: appt.endTime,
      timezone: appt.company.timezone,
    });
    if (eventId) {
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { googleEventId: eventId },
      });
    }
  }
}
