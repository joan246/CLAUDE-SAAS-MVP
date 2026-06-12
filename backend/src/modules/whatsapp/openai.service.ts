import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export interface AiSettings {
  personality: string;
  tone: string;
  rules: string;
  greeting: string;
}

export type Intent =
  | 'greeting'
  | 'book'
  | 'availability'
  | 'reschedule'
  | 'cancel'
  | 'confirm'
  | 'other';

export interface AnalysisResult {
  intent: Intent;
  service: string | null;
  dateHint: string | null;
  timeHint: string | null;
  reply: string;
}

@Injectable()
export class OpenAiService {
  private logger = new Logger(OpenAiService.name);
  private client: OpenAI | null = null;
  private model = 'gpt-4o-mini';
  private provider: 'openai' | 'gemini' | 'none' = 'none';

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    const valid = (k?: string) =>
      !!k && k.length > 15 && !k.includes('your-') && !k.includes('actual-key');

    if (valid(geminiKey)) {
      // Gemini via its OpenAI-compatible endpoint — reuse the OpenAI SDK.
      this.client = new OpenAI({
        apiKey: geminiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        maxRetries: 3, // auto-retry transient 503s
      });
      this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      this.provider = 'gemini';
      this.logger.log(`IA activada con Gemini (${this.model})`);
    } else if (valid(openaiKey) && openaiKey!.startsWith('sk-')) {
      this.client = new OpenAI({ apiKey: openaiKey, maxRetries: 2 });
      this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      this.provider = 'openai';
      this.logger.log(`IA activada con OpenAI (${this.model})`);
    } else {
      this.logger.warn(
        'Sin API key de IA (GEMINI_API_KEY / OPENAI_API_KEY) — usando respuestas de respaldo.',
      );
    }
  }

  /** Parses model JSON output, tolerating ```json code fences. */
  private safeJsonParse(raw: string): any {
    let text = raw.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    }
    return JSON.parse(text);
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  /**
   * Detects intent + extracts booking hints, producing a reply that follows the
   * tenant's configured personality/tone/rules.
   */
  async analyzeMessage(
    message: string,
    ai: AiSettings,
    serviceNames: string[],
    context: Record<string, any> = {},
  ): Promise<AnalysisResult> {
    if (!this.client) {
      return this.fallbackAnalysis(message, ai);
    }

    const today = new Date().toISOString().split('T')[0];
    const systemPrompt = `Eres el asistente virtual de un negocio de servicios con citas.

PERSONALIDAD: ${ai.personality}
TONO: ${ai.tone}
REGLAS DEL NEGOCIO: ${ai.rules}

Servicios disponibles: ${serviceNames.length ? serviceNames.join(', ') : 'no especificados'}.
Fecha de hoy: ${today}.
Contexto de la conversación: ${JSON.stringify(context)}.

Analiza el mensaje del cliente y responde SOLO con un JSON válido con esta forma:
{
  "intent": "greeting | book | availability | reschedule | cancel | confirm | other",
  "service": "nombre del servicio mencionado o null",
  "dateHint": "fecha en formato YYYY-MM-DD si se puede inferir, o null",
  "timeHint": "hora en formato HH:mm si se menciona, o null",
  "reply": "respuesta breve y natural en español, siguiendo la personalidad y el tono"
}
Interpreta fechas relativas (hoy, mañana, el viernes) respecto a la fecha de hoy.`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.5,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      const parsed = this.safeJsonParse(raw);
      return {
        intent: (parsed.intent as Intent) || 'other',
        service: parsed.service ?? null,
        dateHint: parsed.dateHint ?? null,
        timeHint: parsed.timeHint ?? null,
        reply: parsed.reply || ai.greeting,
      };
    } catch (e) {
      this.logger.error(`Error analizando mensaje: ${e}`);
      return this.fallbackAnalysis(message, ai);
    }
  }

  /** Generates a short message (confirmation/reminder) honoring the tone. */
  async generateText(ai: AiSettings, instruction: string): Promise<string> {
    if (!this.client) return instruction;
    try {
      const completion = await this.client.chat.completions.create({
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

  // ── Deterministic fallback (no API key) ────────────────────────────────────
  private fallbackAnalysis(message: string, ai: AiSettings): AnalysisResult {
    const text = message.toLowerCase();
    let intent: Intent = 'other';
    if (/(hola|buenas|buenos d|hey|qué tal)/.test(text)) intent = 'greeting';
    else if (/(cancel|anular)/.test(text)) intent = 'cancel';
    else if (/(reagend|cambiar|mover)/.test(text)) intent = 'reschedule';
    else if (/(disponib|horario|cu[aá]ndo|hueco)/.test(text)) intent = 'availability';
    else if (/(cita|reserv|agend|turno|quiero|me gustar)/.test(text)) intent = 'book';
    else if (/(s[ií]|confirmo|de acuerdo|perfecto|ok)/.test(text)) intent = 'confirm';

    const dateHint = /mañana/.test(text)
      ? this.addDaysISO(1)
      : /hoy/.test(text)
        ? this.addDaysISO(0)
        : null;
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    let timeHint: string | null = null;
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] ?? '00';
      if (timeMatch[3] === 'pm' && h < 12) h += 12;
      if (h >= 0 && h <= 23) timeHint = `${String(h).padStart(2, '0')}:${min}`;
    }

    const replies: Record<Intent, string> = {
      greeting: ai.greeting,
      book: '¡Con gusto te ayudo a agendar! ¿Para qué día te gustaría?',
      availability: '¿Para qué día quieres consultar la disponibilidad?',
      reschedule: 'Claro, ¿para qué nueva fecha y hora quieres mover tu cita?',
      cancel: 'Entiendo, ¿deseas cancelar tu próxima cita?',
      confirm: '¡Perfecto!',
      other: ai.greeting,
    };

    return { intent, service: null, dateHint, timeHint, reply: replies[intent] };
  }

  private addDaysISO(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}
