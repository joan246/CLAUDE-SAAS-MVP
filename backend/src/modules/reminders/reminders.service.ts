import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { GroqService, AiSettings } from '../whatsapp/groq.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class RemindersService {
  private logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsAppService,
    private groq: GroqService,
  ) {}

  /** Runs every 10 minutes; sends any reminder whose trigger time has passed. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    const sent = await this.sendDueReminders();
    if (sent > 0) this.logger.log(`Recordatorios enviados: ${sent}`);
  }

  async sendDueReminders(): Promise<number> {
    const now = new Date();

    const due = await this.prisma.reminder.findMany({
      where: {
        sent: false,
        appointment: {
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
          },
          startTime: { gt: now },
        },
      },
      include: {
        appointment: {
          include: { customer: true, service: true, company: true },
        },
      },
    });

    let count = 0;
    for (const reminder of due) {
      const appt = reminder.appointment;
      const triggerAt = new Date(
        appt.startTime.getTime() -
          reminder.hoursBeforeAppointment * 3600 * 1000,
      );
      if (now < triggerAt) continue; // not yet time

      const ai = await this.getAiSettings(appt.companyId);
      const when = appt.startTime.toLocaleString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

      const message = await this.groq.generateText(
        ai,
        `Escribe un recordatorio amistoso para ${appt.customer.name} sobre su cita de ${
          appt.service?.name ?? 'servicio'
        } el ${when}.`,
      );

      await this.whatsapp.sendMessage(
        appt.companyId,
        appt.customer.phone,
        message,
      );

      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: { sent: true, sentAt: new Date() },
      });
      count += 1;
    }
    return count;
  }

  private async getAiSettings(companyId: string): Promise<AiSettings> {
    const cfg = await this.prisma.aiConfig.findUnique({ where: { companyId } });
    return {
      personality: cfg?.personality ?? 'Amable y profesional',
      tone: cfg?.tone ?? 'Cercano',
      rules: cfg?.rules ?? '',
      greeting: cfg?.greeting ?? '',
    };
  }
}
