import {
  Module,
  Controller,
  Get,
  Query,
  UseGuards,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async metrics(companyId: string, from?: string, to?: string) {
    const end = to ? new Date(to) : new Date();
    const start = from
      ? new Date(from)
      : new Date(end.getTime() - 30 * 86400000);
    const range = { gte: start, lte: end };

    const [
      byStatus,
      revenueAgg,
      topServicesRaw,
      staffLoadRaw,
      customerLoadRaw,
      totalAppointments,
    ] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: { companyId, startTime: range },
        _count: { _all: true },
      }),
      this.prisma.appointment.aggregate({
        _sum: { price: true },
        where: { companyId, status: AppointmentStatus.COMPLETED, startTime: range },
      }),
      this.prisma.appointment.groupBy({
        by: ['serviceId'],
        where: { companyId, startTime: range, serviceId: { not: null } },
        _count: { _all: true },
        _sum: { price: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['staffId'],
        where: { companyId, startTime: range, staffId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['customerId'],
        where: { companyId, status: AppointmentStatus.COMPLETED, startTime: range },
        _count: { _all: true },
      }),
      this.prisma.appointment.count({ where: { companyId, startTime: range } }),
    ]);

    const countFor = (s: AppointmentStatus) =>
      byStatus.find((b) => b.status === s)?._count._all ?? 0;

    const completed = countFor(AppointmentStatus.COMPLETED);
    const cancelled = countFor(AppointmentStatus.CANCELLED);
    const noShows = countFor(AppointmentStatus.NO_SHOW);
    const pending = countFor(AppointmentStatus.PENDING);
    const confirmed = countFor(AppointmentStatus.CONFIRMED);

    // Resolve names for top services / staff load.
    const serviceIds = topServicesRaw.map((s) => s.serviceId!).filter(Boolean);
    const staffIds = staffLoadRaw.map((s) => s.staffId!).filter(Boolean);
    const [services, staff] = await Promise.all([
      this.prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } }),
      this.prisma.staff.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true } }),
    ]);
    const svcName = new Map(services.map((s) => [s.id, s.name]));
    const staffName = new Map(staff.map((s) => [s.id, s.name]));

    const topServices = topServicesRaw
      .map((s) => ({
        serviceId: s.serviceId,
        name: svcName.get(s.serviceId!) ?? '—',
        count: s._count._all,
        revenue: s._sum.price ?? 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const staffLoad = staffLoadRaw
      .map((s) => ({
        staffId: s.staffId,
        name: staffName.get(s.staffId!) ?? '—',
        appointments: s._count._all,
      }))
      .sort((a, b) => b.appointments - a.appointments);

    const recurringCustomers = customerLoadRaw.filter((c) => c._count._all >= 2).length;
    const decided = completed + cancelled + noShows;
    const conversionRate = decided ? Math.round((completed / decided) * 100) : 0;

    return {
      range: { from: start, to: end },
      revenue: revenueAgg._sum.price ?? 0,
      bookings: totalAppointments,
      byStatus: { pending, confirmed, completed, cancelled, noShows },
      cancellations: cancelled,
      noShows,
      conversionRate,
      recurringCustomers,
      topServices,
      staffLoad,
    };
  }
}

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('metrics')
  metrics(
    @CurrentUser('companyId') companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardService.metrics(companyId, from, to);
  }
}

@Module({
  imports: [PrismaModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
