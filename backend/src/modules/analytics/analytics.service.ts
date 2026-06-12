import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardAnalytics(companyId: string, startDate: Date, endDate: Date) {
    // 1. Fetch appointments in period
    const appointments = await this.prisma.appointment.findMany({
      where: {
        companyId,
        startTime: { gte: startDate, lte: endDate },
      },
      include: {
        service: true,
        staff: true,
      },
    });

    // 2. Fetch customers created in period
    const newCustomersCount = await this.prisma.customer.count({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Calculate generic stats
    const totalAppointments = appointments.length;
    const completed = appointments.filter(a => a.status === AppointmentStatus.COMPLETED);
    const cancelled = appointments.filter(a => a.status === AppointmentStatus.CANCELLED);
    const noShows = appointments.filter(a => a.status === AppointmentStatus.NO_SHOW);
    const pending = appointments.filter(a => a.status === AppointmentStatus.PENDING || a.status === AppointmentStatus.CONFIRMED);

    // Ingresos
    const revenue = completed.reduce((sum, a) => sum + (a.price || a.service?.price || 0), 0);

    // Retención (Simplified: users who have more than 1 appointment in total)
    const allCustomers = await this.prisma.customer.findMany({
      where: { companyId },
      include: { _count: { select: { appointments: true } } },
    });
    const recurringCustomers = allCustomers.filter(c => c._count.appointments > 1).length;
    const retentionRate = allCustomers.length > 0 ? (recurringCustomers / allCustomers.length) * 100 : 0;

    // Conversión (Appointments completed vs total appointments booked)
    const conversionRate = totalAppointments > 0 ? (completed.length / totalAppointments) * 100 : 0;

    // Cancelaciones
    const cancellationRate = totalAppointments > 0 ? (cancelled.length / totalAppointments) * 100 : 0;

    // Salud del negocio (Score 0-100)
    // Formula base: Conversion (max 50) + Retention (max 30) - Cancelations (penalty up to 20) + 20 base
    let healthScore = (conversionRate * 0.5) + (retentionRate * 0.3) - (cancellationRate * 0.5) + 20;
    healthScore = Math.max(0, Math.min(100, healthScore)); // Clamp between 0 and 100

    // Citas por día
    const appointmentsByDay = this.aggregateByDay(appointments, startDate, endDate);

    // Citas por estado
    const appointmentsByStatus = [
      { name: 'Completadas', value: completed.length, fill: '#10b981' },
      { name: 'Pendientes', value: pending.length, fill: '#3b82f6' },
      { name: 'Canceladas', value: cancelled.length, fill: '#ef4444' },
      { name: 'No Show', value: noShows.length, fill: '#f59e0b' },
    ];

    // Servicios más solicitados
    const serviceCounts = appointments.reduce((acc, appt) => {
      if (!appt.service) return acc;
      acc[appt.service.name] = (acc[appt.service.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topServices = Object.entries(serviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Empleados destacados
    const staffCounts = appointments.reduce((acc, appt) => {
      if (!appt.staff) return acc;
      acc[appt.staff.name] = (acc[appt.staff.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topStaff = Object.entries(staffCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      overview: {
        healthScore: Math.round(healthScore),
        conversionRate: Math.round(conversionRate),
        retentionRate: Math.round(retentionRate),
        cancellationRate: Math.round(cancellationRate),
        newCustomers: newCustomersCount,
        revenue,
        totalAppointments,
      },
      charts: {
        appointmentsByDay,
        appointmentsByStatus,
        topServices,
        topStaff,
      }
    };
  }

  private aggregateByDay(appointments: any[], startDate: Date, endDate: Date) {
    const days: Record<string, number> = {};
    
    // Initialize all days in range to 0
    let curr = new Date(startDate);
    while (curr <= endDate) {
      days[curr.toISOString().split('T')[0]] = 0;
      curr.setDate(curr.getDate() + 1);
    }

    // Count appointments
    appointments.forEach(appt => {
      const day = new Date(appt.startTime).toISOString().split('T')[0];
      if (days[day] !== undefined) {
        days[day]++;
      }
    });

    // Format for charts
    return Object.entries(days).map(([date, count]) => ({
      date,
      count,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }
}
