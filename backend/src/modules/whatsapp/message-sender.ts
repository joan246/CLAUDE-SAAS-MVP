import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionManager } from './session-manager';

/**
 * MessageSender — único punto de salida de mensajes hacia WhatsApp.
 * Usado por la IA, recordatorios, confirmaciones, cancelaciones y campañas.
 * Registra cada envío en BD y emite el evento message_sent.
 */
@Injectable()
export class MessageSender {
  private logger = new Logger(MessageSender.name);

  constructor(
    private sessionManager: SessionManager,
    private prisma: PrismaService,
  ) {}

  /**
   * Envía texto. `to` puede ser un número limpio ("5215512345678") o un chatId
   * completo ("...@c.us" / "...@lid"). `logAs` permite registrar el mensaje bajo
   * el número normalizado cuando se responde a un chatId interno (@lid).
   */
  async send(
    companyId: string,
    to: string,
    text: string,
    opts: { logAs?: string } = {},
  ): Promise<void> {
    const client = this.sessionManager.getClient(companyId);
    if (!client) {
      throw new Error(
        `La empresa ${companyId} no tiene una sesión de WhatsApp conectada`,
      );
    }

    const chatId = to.includes('@') ? to : `${to.replace(/\D/g, '')}@c.us`;
    await client.sendMessage(chatId, text);

    const phoneNumber =
      opts.logAs ?? chatId.replace(/@.*$/, '').split(':')[0];

    await this.prisma.whatsAppMessage.create({
      data: { companyId, phoneNumber, message: text, direction: 'outgoing' },
    });
    await this.sessionManager.touchLastSync(companyId);
    this.sessionManager.events.emit('message_sent', {
      companyId,
      phoneNumber,
      body: text,
      timestamp: new Date().toISOString(),
    });
  }

  /** Variante que no lanza: para flujos automáticos (recordatorios, campañas). */
  async trySend(
    companyId: string,
    to: string,
    text: string,
    opts: { logAs?: string } = {},
  ): Promise<boolean> {
    try {
      await this.send(companyId, to, text, opts);
      return true;
    } catch (e: any) {
      this.logger.error(`[${companyId}] Error enviando a ${to}: ${e.message || e}`);
      return false;
    }
  }
}
