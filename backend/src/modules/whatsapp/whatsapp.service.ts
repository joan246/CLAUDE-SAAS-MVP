import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { GroqService, AiSettings } from './groq.service';
import { AppointmentStatus } from '@prisma/client';
import {
  MESSAGING_PROVIDER,
  MessagingProvider,
} from '../messaging/messaging-provider.interface';

/**
 * WhatsAppService — lógica de negocio de la conversación (agente IA,
 * confirmaciones, cancelaciones, modo humano). El transporte (sesiones,
 * envío y recepción real) vive detrás de MessagingProvider, por lo que
 * este servicio no conoce los detalles de whatsapp-web.js.
 */
@Injectable()
export class WhatsAppService {
  private logger = new Logger(WhatsAppService.name);

  constructor(
    private prisma: PrismaService,
    private customersService: CustomersService,
    private appointmentsService: AppointmentsService,
    private groqService: GroqService,
    @Inject(MESSAGING_PROVIDER) private messaging: MessagingProvider,
  ) {}

  // ─────────────────────────── AGENT CORE ───────────────────────────
  async processMessage(
    companyId: string,
    phone: string,
    contactName: string,
    text: string,
    conv: any,
  ): Promise<string> {
    const ai = await this.getAiSettings(companyId);
    if (!ai.enabled) {
      return 'Gracias por tu mensaje. En breve te atenderemos.';
    }

    console.log('--- DEBUG WHATSAPP ---');
    console.log('full_conv:', JSON.stringify(conv, null, 2));
    console.log('----------------------');

    const customer = await this.customersService.findOrCreateByPhone(
      companyId,
      phone,
      contactName,
    );

    // Obtener los últimos 15 mensajes como historial
    const rawHistory = await this.prisma.whatsAppMessage.findMany({
      where: { companyId, phoneNumber: phone },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    const history = rawHistory.reverse().map((msg) => ({
      role: msg.direction === 'incoming' ? 'user' : 'assistant',
      content: msg.message,
    })) as any[];

    // Añadir un mensaje del sistema extra si necesitamos inyectar estado de reservas actuales
    const nextAppt = await this.findNextAppointment(companyId, phone);
    if (nextAppt) {
      history.unshift({
        role: 'system',
        content: `El usuario tiene una próxima cita agendada para el ${nextAppt.startTime.toISOString()} del servicio con ID: ${nextAppt.serviceId || 'N/A'}. Su appointmentId es ${nextAppt.id}.`,
      });
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true },
    });
    const timezone = company?.timezone || 'America/Mexico_City';

    // Loop de Tool Calling (máximo 5 saltos para evitar loops infinitos)
    let maxLoops = 5;
    let currentHistory = [...history];

    while (maxLoops > 0) {
      maxLoops--;
      const response = await this.groqService.conversationalChat(
        currentHistory,
        ai,
        contactName,
        timezone,
      );

      // Si Groq nos responde con texto puro, lo devolvemos al usuario
      if (!response.tool_calls || response.tool_calls.length === 0) {
        let finalReply = response.content || 'Parece que hubo un error procesando tu solicitud.';
        // Llama 3 a veces filtra sus etiquetas internas de tool calling en el texto
        finalReply = finalReply.replace(/<function=.*?>.*?<\/function>/gs, '').trim();
        return finalReply || 'Entendido.';
      }

      // Si hay tool calls, procesamos cada una
      currentHistory.push(response); // agregar el mensaje del asistente con sus tool_calls

      for (const toolCall of response.tool_calls) {
        const result = await this.executeTool(companyId, customer.id, phone, toolCall);
        currentHistory.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      }
    }

    return 'Parece que estoy teniendo problemas para completar la tarea. ¿En qué más puedo ayudarte?';
  }

  private async executeTool(
    companyId: string,
    customerId: string,
    phone: string,
    toolCall: any,
  ): Promise<any> {
    this.logger.log(`LLM ejecutando herramienta: ${toolCall.function.name}`);
    try {
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === 'get_services') {
        const services = await this.prisma.service.findMany({
          where: { companyId, active: true },
          select: { id: true, name: true, duration: true, price: true },
          orderBy: { createdAt: 'asc' },
        });
        return services;
      }

      if (toolCall.function.name === 'get_available_slots') {
        const date = new Date(`${args.date}T12:00:00`);
        const slots = await this.appointmentsService.getAvailableSlots(
          companyId,
          date,
          args.serviceId,
        );
        return slots.length > 0 ? slots : { error: 'No hay horarios disponibles ese día.' };
      }

      if (toolCall.function.name === 'book_appointment') {
        const appt = await this.appointmentsService.create(companyId, {
          customerId: customerId,
          serviceId: args.serviceId,
          startTime: args.isoTime,
        });
        return { success: true, appointmentId: appt.id, message: 'Cita creada con éxito.' };
      }

      if (toolCall.function.name === 'cancel_next_appointment') {
        const result = await this.handleCancel(companyId, phone);
        return { success: true, message: result };
      }

      return { error: 'Unknown tool' };
    } catch (e: any) {
      this.logger.error(`Error en tool ${toolCall.function.name}: ${e.message}`);
      return { error: e.message || 'Error interno al ejecutar la acción.' };
    }
  }

  private async handleCancel(companyId: string, phone: string): Promise<string> {
    const customer = await this.customersService.findByPhone(companyId, phone);
    if (!customer) return 'No encontré citas asociadas a tu número.';
    const next = await this.findNextAppointment(companyId, phone);
    if (!next) return 'No tienes citas próximas para cancelar.';

    const result = await this.appointmentsService.cancel(companyId, next.id);
    let msg = `Tu cita ha sido cancelada.`;
    if (result.policyMessage) msg += `\n${result.policyMessage}`;
    return msg;
  }

  private async findNextAppointment(companyId: string, phone: string) {
    const customer = await this.customersService.findByPhone(companyId, phone);
    if (!customer) return null;
    return this.prisma.appointment.findFirst({
      where: {
        companyId,
        customerId: customer.id,
        startTime: { gte: new Date() },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  private async getAiSettings(
    companyId: string,
  ): Promise<AiSettings & { enabled: boolean; customSystemPrompt?: string; knowledgeBase?: string }> {
    const cfg = await this.prisma.aiConfig.findUnique({ where: { companyId } });
    const docs = await this.prisma.knowledgeDocument.findMany({
      where: { companyId, active: true },
    });

    const knowledgeBase = docs.map((d) => `--- ${d.title} ---\n${d.content}`).join('\n\n');

    return {
      enabled: cfg?.enabled ?? true,
      personality: cfg?.personality ?? 'Amable y profesional',
      tone: cfg?.tone ?? 'Cercano',
      rules: cfg?.rules ?? '',
      greeting: cfg?.greeting ?? '¡Hola! ¿En qué puedo ayudarte?',
      customSystemPrompt: cfg?.customSystemPrompt ?? undefined,
      knowledgeBase: knowledgeBase || undefined,
    };
  }

  /** Devuelve (o crea) el estado de conversación de un número. */
  async getConversation(companyId: string, phone: string) {
    const existing = await this.prisma.conversationState.findUnique({
      where: { companyId_phoneNumber: { companyId, phoneNumber: phone } },
    });
    if (existing) return existing;
    return this.prisma.conversationState.create({
      data: {
        companyId,
        phoneNumber: phone,
        state: 'active',
        botMode: 'AI',
        context: JSON.stringify({ step: 'idle' }),
      },
    });
  }

  // ─────────────────────────── ENVÍO (vía MessagingProvider) ───────────────────────────

  /**
   * Envío genérico usado por recordatorios, confirmaciones y cancelaciones.
   * No lanza: los flujos automáticos no deben romperse si la sesión está caída.
   */
  async sendMessage(companyId: string, toNumber: string, message: string) {
    try {
      await this.messaging.sendMessage(companyId, toNumber, message);
    } catch (e: any) {
      this.logger.error(`Error enviando mensaje a ${toNumber}: ${e.message || e}`);
    }
  }

  // Permite enviar un mensaje manualmente desde el Frontend y cambiar a MODO HUMANO
  async sendManualMessage(companyId: string, toNumber: string, message: string) {
    // 1. Forzar el bot a modo humano (creando el estado si no existe)
    await this.prisma.conversationState.upsert({
      where: { companyId_phoneNumber: { companyId, phoneNumber: toNumber } },
      create: {
        companyId,
        phoneNumber: toNumber,
        state: 'active',
        botMode: 'HUMAN',
        context: JSON.stringify({ step: 'idle' }),
      },
      update: { botMode: 'HUMAN' },
    });

    // 2. Enviar (el provider registra el mensaje y emite message_sent)
    await this.messaging.sendMessage(companyId, toNumber, message);
  }

  async toggleBotMode(companyId: string, toNumber: string, mode: 'AI' | 'HUMAN') {
    await this.prisma.conversationState.update({
      where: { companyId_phoneNumber: { companyId, phoneNumber: toNumber } },
      data: { botMode: mode },
    });
  }

  async getConversations(companyId: string) {
    return this.prisma.conversationState.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
      include: {
        company: {
          select: { name: true },
        },
      },
    });
  }

  async getMessages(companyId: string, phoneNumber: string) {
    return this.prisma.whatsAppMessage.findMany({
      where: { companyId, phoneNumber },
      orderBy: { createdAt: 'asc' },
    });
  }
}
