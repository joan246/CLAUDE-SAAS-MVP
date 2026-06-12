import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { SchedulingService } from './scheduling.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [PrismaModule, GoogleCalendarModule, RulesModule],
  providers: [AppointmentsService, SchedulingService],
  controllers: [AppointmentsController],
  exports: [AppointmentsService, SchedulingService],
})
export class AppointmentsModule {}
