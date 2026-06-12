import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'groq-sdk/resources/chat/completions';
import { utcToLocalDateStr, utcToLocalTimeStr } from 'src/common/timezone';

export interface AiSettings {
  personality: string;
  tone: string;
  rules: string;
  greeting: string;
}

const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_services',
      description: 'Obtiene la lista de servicios que ofrece el negocio, con sus IDs y duraciones.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_slots',
      description: 'Consulta los horarios disponibles para un servicio en una fecha específica.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Fecha a consultar en formato YYYY-MM-DD' },
          serviceId: { type: 'string', description: 'ID del servicio (obtenido de get_services)' },
        },
        required: ['date', 'serviceId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description: 'Agenda una cita para el cliente en el horario y servicio especificados.',
      parameters: {
        type: 'object',
        properties: {
          serviceId: { type: 'string', description: 'ID del servicio' },
          isoTime: { type: 'string', description: 'Fecha y hora exacta en formato ISO 8601' },
        },
        required: ['serviceId', 'isoTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_next_appointment',
      description: 'Cancela la próxima cita programada del cliente.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

@Injectable()
export class GroqService {
  private logger = new Logger(GroqService.name);
  private groq: Groq | null = null;
  private model: string = 'llama-3.3-70b-versatile';

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey && apiKey.startsWith('gsk_')) {
      this.groq = new Groq({ apiKey });
      this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
      this.logger.log(`IA activada con Groq (${this.model}) y Tool Calling`);
    } else {
      this.logger.warn('Sin GROQ_API_KEY válido — IA deshabilitada.');
    }
  }

  get enabled(): boolean {
    return this.groq !== null;
  }

  async conversationalChat(
    history: ChatCompletionMessageParam[],
    ai: AiSettings & { customSystemPrompt?: string; knowledgeBase?: string },
    customerName: string,
    timeZone: string,
  ): Promise<any> {
    if (!this.groq) {
      return { content: 'El servicio de IA no está configurado. Por favor, contacta directamente con el negocio.' };
    }

    const now = new Date();
    const localDate = utcToLocalDateStr(now, timeZone);
    const localTime = utcToLocalTimeStr(now, timeZone);
    
    let systemPrompt = ai.customSystemPrompt || `Eres el recepcionista del negocio y estás atendiendo por WhatsApp. 
Tu objetivo es ayudar al cliente a agendar citas, cancelar o responder dudas.
Debes usar las herramientas (tools) disponibles para consultar servicios, consultar horarios y agendar/cancelar.
¡IMPORTANTE! NO INVENTES HORARIOS. Siempre usa get_available_slots antes de confirmar un horario.
¡IMPORTANTE! NO INVENTES SERVICIOS. Siempre usa get_services si el cliente no es claro o quieres mostrar el menú.

REGLAS DE COMUNICACIÓN MUY IMPORTANTES:
1. Habla SIEMPRE en primera persona del singular (ej: "yo te ayudo", "tengo disponibilidad", "déjame revisar").
2. NUNCA digas que eres una inteligencia artificial, un asistente virtual o un bot. Compórtate como una persona real.
3. Envía un solo mensaje de texto final integrando todo, pero si el cliente te pide varias cosas a la vez (ej. agendar dos servicios, o agendar y preguntar algo), puedes y debes resolver todo en tu misma respuesta.
4. Puedes invocar la herramienta de agendar múltiples veces en el mismo turno si el cliente requiere varios servicios en la misma u otra fecha.

CLIENTE CON EL QUE HABLAS: ${customerName}
FECHA ACTUAL: ${localDate} (Hora local aproximada: ${localTime})

PERSONALIDAD: ${ai.personality}
TONO: ${ai.tone}
REGLAS: ${ai.rules}`;

    if (ai.knowledgeBase) {
      systemPrompt += `\n\nBASE DE CONOCIMIENTO (Usa esta información para responder preguntas sobre el negocio):\n${ai.knowledgeBase}`;
    }

    const messages = [
      { role: 'system', content: systemPrompt } as ChatCompletionMessageParam,
      ...history,
    ];

    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        temperature: 0.3,
        messages,
        tools,
        tool_choice: 'auto',
        max_tokens: 500,
      });

      return completion.choices[0]?.message;
    } catch (e) {
      this.logger.error(`Error en Groq conversationalChat: ${e}`);
      return { content: 'Lo siento, tuve un problema procesando tu mensaje. ¿Podemos intentarlo de nuevo?' };
    }
  }

  async generateText(ai: AiSettings, instruction: string): Promise<string> {
    if (!this.groq) return instruction;
    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        temperature: 0.6,
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content: `Eres el asistente de un negocio. Personalidad: ${ai.personality}. Tono: ${ai.tone}. Responde en español, breve (máx 2 frases).`,
          },
          { role: 'user', content: instruction },
        ],
      });
      return completion.choices[0]?.message?.content?.trim() || instruction;
    } catch {
      return instruction;
    }
  }
}
