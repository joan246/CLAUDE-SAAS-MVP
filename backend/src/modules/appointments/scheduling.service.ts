import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';
import { localToUtc, utcToLocalDateStr } from 'src/common/timezone';

const ACTIVE = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

export interface SlotOption {
  time: string; // ISO start time
  staff: { id: string; name: string }[]; // staff available at this time
}

interface DayAppointment {
  staffId: string | null;
  startTime: Date;
  endTime: Date;
  resources: { resourceId: string; quantity: number }[];
}

/**
 * Scheduling / assignment engine.
 * Computes availability honoring: company hours, per-staff schedule, time-off,
 * staff simultaneous capacity, existing bookings and shared-resource capacity.
 */
@Injectable()
export class SchedulingService {
  constructor(private prisma: PrismaService) {}

  private overlaps(aS: Date, aE: Date, bS: Date, bE: Date): boolean {
    return aS < bE && bS < aE;
  }

  /** Loads everything the engine needs for one company/service/day. */
  private async loadContext(companyId: string, serviceId: string, date: Date) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, companyId },
      include: { resources: true },
    });
    if (!service) throw new NotFoundException('Servicio no encontrado');

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true },
    });
    const timezone = company?.timezone || 'America/Mexico_City';

    const dateStr = date.toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

    const companyHours = await this.prisma.businessHours.findUnique({
      where: { companyId_dayOfWeek: { companyId, dayOfWeek } },
    });

    // Staff that can perform this service, active, with schedule + time-off.
    const eligible = await this.prisma.staffService.findMany({
      where: { serviceId, staff: { companyId, active: true } },
      include: {
        staff: {
          include: {
            schedule: true,
            timeOff: true,
          },
        },
      },
    });

    // Day window for prefetching appointments, in the company's timezone.
    const dayStart = localToUtc(dateStr, '00:00', timezone);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);

    const dayAppointments: DayAppointment[] = (
      await this.prisma.appointment.findMany({
        where: {
          companyId,
          status: { in: ACTIVE },
          startTime: { gte: dayStart, lt: dayEnd },
        },
        select: {
          staffId: true,
          startTime: true,
          endTime: true,
          resources: { select: { resourceId: true, quantity: true } },
        },
      })
    ).map((a) => ({
      staffId: a.staffId,
      startTime: a.startTime,
      endTime: a.endTime,
      resources: a.resources,
    }));

    // Resource capacities for required resources.
    const resourceCaps = new Map<string, number>();
    if (service.resources.length) {
      const resources = await this.prisma.resource.findMany({
        where: { companyId, id: { in: service.resources.map((r) => r.resourceId) } },
      });
      resources.forEach((r) => resourceCaps.set(r.id, r.capacity));
    }

    return { service, companyHours, eligible, dayAppointments, resourceCaps, timezone, dateStr };
  }

  /** Are all resources required by the service available during [start,end)? */
  private resourcesFree(
    service: { resources: { resourceId: string; quantity: number }[] },
    resourceCaps: Map<string, number>,
    dayAppointments: DayAppointment[],
    start: Date,
    end: Date,
    ignore?: (a: DayAppointment) => boolean,
  ): boolean {
    for (const req of service.resources) {
      const cap = resourceCaps.get(req.resourceId) ?? 1;
      let used = 0;
      for (const appt of dayAppointments) {
        if (ignore && ignore(appt)) continue;
        if (!this.overlaps(start, end, appt.startTime, appt.endTime)) continue;
        for (const r of appt.resources) {
          if (r.resourceId === req.resourceId) used += r.quantity;
        }
      }
      if (used + req.quantity > cap) return false;
    }
    return true;
  }

  /** Is a staff member free during [start,end)? (capacity + time-off) */
  private staffFree(
    staffId: string,
    capacity: number,
    timeOff: { start: Date; end: Date }[],
    dayAppointments: DayAppointment[],
    start: Date,
    end: Date,
  ): boolean {
    for (const off of timeOff) {
      if (this.overlaps(start, end, off.start, off.end)) return false;
    }
    const concurrent = dayAppointments.filter(
      (a) => a.staffId === staffId && this.overlaps(start, end, a.startTime, a.endTime),
    ).length;
    return concurrent < capacity;
  }

  /**
   * Available start times for a service on a date. Each slot lists the staff
   * who can take it. If staffId is given, only that staff is considered.
   */
  async getAvailability(
    companyId: string,
    serviceId: string,
    date: Date,
    staffId?: string,
  ): Promise<SlotOption[]> {
    const { service, companyHours, eligible, dayAppointments, resourceCaps, timezone, dateStr } =
      await this.loadContext(companyId, serviceId, date);

    if (!companyHours || !companyHours.isOpen) return [];

    const now = new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const slotMap = new Map<string, { id: string; name: string }[]>();

    const toMinutes = (hhmm: string): number => {
      const [h, min] = hhmm.split(':').map(Number);
      return h * 60 + min;
    };

    for (const es of eligible) {
      const staff = es.staff;
      if (staffId && staff.id !== staffId) continue;

      const sched = staff.schedule.find((s) => s.dayOfWeek === dayOfWeek);
      if (!sched || !sched.isWorking) continue;

      // Window = intersection of company hours and staff schedule in local minutes.
      const winStartMin = Math.max(
        toMinutes(companyHours.startTime),
        toMinutes(sched.startTime),
      );
      const winEndMin = Math.min(
        toMinutes(companyHours.endTime),
        toMinutes(sched.endTime),
      );

      const dur = es.avgDuration ?? service.duration;
      const block = service.prepTime + dur + service.cleanupTime;
      const step = block + service.buffer;

      let curMin = winStartMin;
      while (curMin + block <= winEndMin) {
        const hStr = Math.floor(curMin / 60).toString().padStart(2, '0');
        const mStr = (curMin % 60).toString().padStart(2, '0');
        const cur = localToUtc(dateStr, `${hStr}:${mStr}`, timezone);
        const end = new Date(cur.getTime() + block * 60000);

        if (
          cur > now &&
          this.staffFree(staff.id, staff.simultaneousCapacity, staff.timeOff, dayAppointments, cur, end) &&
          this.resourcesFree(service, resourceCaps, dayAppointments, cur, end)
        ) {
          const iso = cur.toISOString();
          if (!slotMap.has(iso)) slotMap.set(iso, []);
          slotMap.get(iso)!.push({ id: staff.id, name: staff.name });
        }
        curMin += step;
      }
    }

    return Array.from(slotMap.entries())
      .map(([time, staff]) => ({ time, staff }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  /**
   * Chooses the best staff for a confirmed [start,end): least load today,
   * then highest priority. Returns null if none free.
   */
  async assignStaff(
    companyId: string,
    serviceId: string,
    start: Date,
    end: Date,
    preferredStaffId?: string,
  ): Promise<string | null> {
    const { service, eligible, dayAppointments, resourceCaps, timezone } =
      await this.loadContext(companyId, serviceId, start);

    if (!this.resourcesFree(service, resourceCaps, dayAppointments, start, end)) {
      return null; // a required resource is fully booked
    }

    const dateStr = utcToLocalDateStr(start, timezone);
    const [y, m, d] = dateStr.split('-').map(Number);
    const localDayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

    const candidates = eligible
      .map((es) => es.staff)
      .filter((staff) => {
        const sched = staff.schedule.find((s) => s.dayOfWeek === localDayOfWeek);
        if (!sched || !sched.isWorking) return false;
        
        const winStart = localToUtc(dateStr, sched.startTime, timezone);
        const winEnd = localToUtc(dateStr, sched.endTime, timezone);
        if (start < winStart || end > winEnd) return false;
        
        return this.staffFree(
          staff.id,
          staff.simultaneousCapacity,
          staff.timeOff,
          dayAppointments,
          start,
          end,
        );
      });

    if (!candidates.length) return null;

    if (preferredStaffId) {
      const pref = candidates.find((c) => c.id === preferredStaffId);
      if (pref) return pref.id;
    }

    const loadOf = (staffId: string) =>
      dayAppointments.filter((a) => a.staffId === staffId).length;

    candidates.sort((a, b) => {
      const l = loadOf(a.id) - loadOf(b.id);
      if (l !== 0) return l;
      return b.priority - a.priority;
    });

    return candidates[0].id;
  }
}
