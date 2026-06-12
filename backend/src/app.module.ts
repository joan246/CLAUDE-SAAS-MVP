import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { StaffModule } from './modules/staff/staff.module';
import { ServicesModule } from './modules/services/services.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { RulesModule } from './modules/rules/rules.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { GoogleCalendarModule } from './modules/google-calendar/google-calendar.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    StaffModule,
    ServicesModule,
    CategoriesModule,
    ResourcesModule,
    CustomersModule,
    AppointmentsModule,
    RulesModule,
    CampaignsModule,
    DashboardModule,
    GoogleCalendarModule,
    WhatsAppModule,
    RemindersModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
