import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Message } from 'whatsapp-web.js';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionManager } from './session-manager';
import { MessageSender } from './message-sender';
import { WhatsAppService } from './whatsapp.service';

// ── Retrasos "humanos" antes de responder (configurables por entorno) ──
// Evitan el patrón de respuesta instantánea que WhatsApp asocia a bots y que
// puede derivar en el bloqueo del número. Valores por defecto conservadores.
const READ_MIN_MS = Number(process.env.WA_READ_MIN_MS ?? 3000); // pausa de "lectura" mínima
const READ_MAX_MS = Number(process.env.WA_READ_MAX_MS ?? 8000); // pausa de "lectura" máxima
const TYPING_MS_PER_CHAR = Number(process.env.WA_TYPING_MS_PER_CHAR ?? 75); // velocidad de "escritura"
const TYPING_MIN_MS = Number(process.env.WA_TYPING_MIN_MS ?? 2500); // tiempo mínimo escribiendo
const TYPING_MAX_MS = Number(process.env.WA_TYPING_MAX_MS ?? 18000); // tope de tiempo escribiendo

/**
 * MessageListener — recibe los mensajes entrantes de todas las sesiones,
 * los normaliza, los registra, detecta el chat/cliente y dispara la
 * respuesta automática de la IA cuando corresponde.
 */
@Injectable()
export class MessageListener implements OnModuleInit {
  private logger = new Logger(MessageListener.name);

  constructor(
    private sessionManager: SessionManager,
    private messageSender: MessageSender,
    private whatsAppService: WhatsAppService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.sessionManager.events.on('message', (companyId: string, message: Message) =>
      this.handleIncoming(companyId, message).catch((e) =>
        this.logger.error(`[${companyId}] Error procesando mensaje entrante: ${e}`),
      ),
    );
  }

  private async handleIncoming(companyId: string, message: Message) {
    if (message.from === 'status@broadcast') return;
    if (message.from.endsWith('@g.us')) return; // grupos: el bot solo atiende chats directos

    const text = message.body;
    if (!text) return; // medios sin texto: fuera del alcance del MVP

    // Número y nombre reales del contacto
    const contact = await message.getContact();
    const contactName = contact.pushname || contact.name || 'Cliente';
    
    // contact.id.user contiene el número de teléfono real sin sufijos (ej: "573160539099").
    // contact.number o message.from a menudo traen el identificador interno (LID).
    const fromNumber =
      contact.id?.user ||
      message.from.replace('@c.us', '').replace('@lid', '').split(':')[0];

    this.logger.log(`[${companyId}] Mensaje de ${fromNumber} (${contactName})`);

    await this.prisma.whatsAppMessage.create({
      data: { companyId, phoneNumber: fromNumber, message: text, direction: 'incoming' },
    });
    await this.sessionManager.touchLastSync(companyId);
    this.sessionManager.events.emit('message_received', {
      companyId,
      phoneNumber: fromNumber,
      body: text,
      timestamp: new Date().toISOString(),
    });

    // Si la conversación está en modo humano, la IA no interviene
    const conv = await this.whatsAppService.getConversation(companyId, fromNumber);
    if (conv.botMode === 'HUMAN') {
      this.logger.log(`[${companyId}] ${fromNumber} en modo humano — IA en silencio`);
      return;
    }

    const reply = await this.whatsAppService.processMessage(
      companyId,
      fromNumber,
      contactName,
      text,
      conv,
    );
    if (!reply) return;

    // ── Retraso humano en dos fases (anti-bloqueo de WhatsApp) ──
    // 1) Pausa de "lectura" del mensaje del cliente, sin indicador de escritura.
    const readMs =
      READ_MIN_MS + Math.floor(Math.random() * Math.max(0, READ_MAX_MS - READ_MIN_MS));
    await this.sleep(readMs);

    // 2) "Escribiendo…" durante un tiempo proporcional a la longitud de la respuesta
    //    (con jitter ±20% para que no sea constante). A mayor texto, más tarda.
    const jitter = 0.8 + Math.random() * 0.4;
    const typeMs = Math.min(
      Math.max(Math.round(reply.length * TYPING_MS_PER_CHAR * jitter), TYPING_MIN_MS),
      TYPING_MAX_MS,
    );
    const chat = await message.getChat().catch(() => null);
    await chat?.sendStateTyping().catch(() => undefined);
    await this.sleep(typeMs);
    await chat?.clearState().catch(() => undefined);

    this.logger.log(
      `[${companyId}] Respondiendo a ${fromNumber} tras ${(
        (readMs + typeMs) /
        1000
      ).toFixed(1)}s (lectura ${(readMs / 1000).toFixed(1)}s + escritura ${(
        typeMs / 1000
      ).toFixed(1)}s)`,
    );

    // Responder al chatId original (preserva enrutado @lid) registrando el número real
    await this.messageSender.trySend(companyId, message.from, reply, {
      logAs: fromNumber,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
