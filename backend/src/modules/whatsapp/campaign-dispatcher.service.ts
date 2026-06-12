import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionManager } from './session-manager';
import { MessageSender } from './message-sender';

/** Máximo de envíos por ciclo y pausa entre ellos (anti-bloqueo de WhatsApp). */
const BATCH_SIZE = 20;
const DELAY_BETWEEN_SENDS_MS = 2_000;

/**
 * CampaignDispatcher — ejecuta las campañas de remarketing por WhatsApp.
 * El módulo de campañas solo encola CampaignSend en estado PENDING;
 * este servicio (dentro del dominio WhatsApp) realiza el envío real
 * cuando la empresa tiene su sesión conectada.
 */
@Injectable()
export class CampaignDispatcherService {
  private logger = new Logger(CampaignDispatcherService.name);
  private running = false;

  constructor(
    private prisma: PrismaService,
    private sessionManager: SessionManager,
    private messageSender: MessageSender,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    if (process.env.SKIP_WA === 'true') return;
    if (this.running) return; // evitar solapamiento entre ciclos
    this.running = true;
    try {
      const sent = await this.dispatchPending();
      if (sent > 0) this.logger.log(`Campañas: ${sent} mensaje(s) enviados`);
    } finally {
      this.running = false;
    }
  }

  async dispatchPending(): Promise<number> {
    const pending = await this.prisma.campaignSend.findMany({
      where: { status: 'PENDING', channel: 'WHATSAPP' },
      include: { campaign: true, customer: true },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    let sent = 0;
    for (const item of pending) {
      if (!item.campaign.active) {
        await this.mark(item.id, 'SKIPPED');
        continue;
      }
      // Sin sesión conectada se deja PENDING y se reintenta en el próximo ciclo
      if (!this.sessionManager.getClient(item.campaign.companyId)) continue;

      const message = this.render(item.campaign.messageTemplate, {
        nombre: item.customer.name,
      });

      const ok = await this.messageSender.trySend(
        item.campaign.companyId,
        item.customer.phone,
        message,
      );
      await this.mark(item.id, ok ? 'SENT' : 'FAILED', ok ? new Date() : undefined);
      if (ok) sent += 1;
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_SENDS_MS));
    }
    return sent;
  }

  /** Sustituye placeholders {nombre} / {{nombre}} en la plantilla. */
  private render(template: string, vars: Record<string, string>): string {
    let out = template;
    for (const [key, value] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{\\{?\\s*${key}\\s*\\}?\\}`, 'gi'), value);
    }
    return out;
  }

  private mark(id: string, status: string, sentAt?: Date) {
    return this.prisma.campaignSend.update({
      where: { id },
      data: { status, sentAt: sentAt ?? null },
    });
  }
}
