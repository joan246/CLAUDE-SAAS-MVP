import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  MessagingProvider,
  MessagingChannel,
  MessagingEvent,
  MessagingSessionStatus,
} from '../messaging/messaging-provider.interface';
import { SessionManager } from './session-manager';
import { MessageSender } from './message-sender';
import { QRManager } from './qr-manager';

/**
 * Implementación de MessagingProvider mediante dispositivo vinculado
 * (whatsapp-web.js). Es la única clase que conoce los detalles del transporte;
 * sustituirla por Cloud API / Instagram / Telegram no afecta a los consumidores.
 */
@Injectable()
export class WhatsAppLinkedDeviceProvider implements MessagingProvider {
  readonly channel: MessagingChannel = 'whatsapp';

  constructor(
    private sessionManager: SessionManager,
    private messageSender: MessageSender,
    private qrManager: QRManager,
    private prisma: PrismaService,
  ) {}

  async startSession(companyId: string): Promise<MessagingSessionStatus> {
    await this.sessionManager.startSession(companyId);
    return this.getSessionStatus(companyId);
  }

  async stopSession(companyId: string, opts: { logout?: boolean } = {}): Promise<void> {
    await this.sessionManager.stopSession(companyId, opts);
  }

  async restartSession(companyId: string): Promise<MessagingSessionStatus> {
    await this.sessionManager.restartSession(companyId);
    return this.getSessionStatus(companyId);
  }

  async getSessionStatus(companyId: string): Promise<MessagingSessionStatus> {
    const row = await this.prisma.whatsAppSession.findUnique({ where: { companyId } });
    const runtime = this.sessionManager.getRuntimeStatus(companyId);
    const qr = this.qrManager.get(companyId);
    return {
      channel: this.channel,
      // el estado runtime manda (la BD puede ir un paso atrás)
      status: runtime !== 'DISCONNECTED' ? runtime : row?.status ?? 'DISCONNECTED',
      phoneNumber: row?.phoneNumber ?? null,
      displayName: row?.displayName ?? null,
      connectedAt: row?.connectedAt?.toISOString() ?? null,
      lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
      qr: qr
        ? { dataUrl: qr.dataUrl, generatedAt: qr.generatedAt.toISOString() }
        : null,
    };
  }

  async sendMessage(
    companyId: string,
    to: string,
    text: string,
    opts?: { logAs?: string },
  ): Promise<void> {
    await this.messageSender.send(companyId, to, text, opts);
  }

  on(event: MessagingEvent, handler: (payload: any) => void): void {
    this.sessionManager.events.on(event, handler);
  }
}
