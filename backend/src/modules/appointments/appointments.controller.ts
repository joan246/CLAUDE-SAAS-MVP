import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dtos/create-appointment.dto';
import { UpdateAppointmentDto } from './dtos/update-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(companyId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.appointmentsService.findAll(companyId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      staffId,
    });
  }

  @Get('today')
  getToday(@CurrentUser('companyId') companyId: string) {
    return this.appointmentsService.getTodayAppointments(companyId);
  }

  @Get('upcoming')
  getUpcoming(@CurrentUser('companyId') companyId: string) {
    return this.appointmentsService.getUpcomingAppointments(companyId);
  }

  // Backward-compatible list of available start times.
  @Get('available-slots')
  getAvailableSlots(
    @CurrentUser('companyId') companyId: string,
    @Query('date') date: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.appointmentsService.getAvailableSlots(
      companyId,
      new Date(date),
      serviceId,
    );
  }

  // Rich availability: each slot + the staff who can take it.
  @Get('availability')
  getAvailability(
    @CurrentUser('companyId') companyId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.appointmentsService.getAvailability(
      companyId,
      serviceId,
      new Date(date),
      staffId,
    );
  }

  @Get(':id')
  findOne(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.appointmentsService.findOne(companyId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(companyId, id, dto);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.appointmentsService.cancel(companyId, id);
  }

  @Delete(':id')
  delete(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.appointmentsService.delete(companyId, id);
  }
}
