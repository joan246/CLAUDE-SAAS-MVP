/**
 * Capa de abstracción de mensajería.
 *
 * El resto del sistema (recordatorios, campañas, chat manual, IA) depende
 * únicamente de esta interfaz. La implementación inicial es WhatsApp por
 * dispositivo vinculado (whatsapp-web.js); en el futuro puede sustituirse por
 * WhatsApp Cloud API, Instagram, Facebook Messenger o Telegram registrando
 * otra clase bajo el mismo token MESSAGING_PROVIDER, sin tocar a los consumidores.
 */

export const MESSAGING_PROVIDER = 'MESSAGING_PROVIDER';

export type MessagingChannel =
  | 'whatsapp'
  | 'whatsapp-cloud'
  | 'instagram'
  | 'messenger'
  | 'telegram';

export type MessagingSessionState =
  | 'DISCONNECTED'
  | 'INITIALIZING'
  | 'QR_PENDING'
  | 'CONNECTED'
  | 'RECONNECTING';

/** Eventos del ciclo de vida de una sesión de mensajería. */
export type MessagingEvent =
  | 'qr_generated'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'message_received'
  | 'message_sent'
  | 'session_restored';

export interface QrPayload {
  companyId: string;
  qr: string; // contenido crudo del QR
  qrDataUrl: string; // imagen PNG en data-URL lista para <img src>
  generatedAt: string; // ISO
}

export interface SessionEventPayload {
  companyId: string;
  phoneNumber?: string | null;
  displayName?: string | null;
  reason?: string;
  attempt?: number;
}

export interface MessageEventPayload {
  companyId: string;
  phoneNumber: string;
  body: string;
  timestamp: string; // ISO
}

export interface MessagingSessionStatus {
  channel: MessagingChannel;
  status: MessagingSessionState;
  phoneNumber: string | null;
  displayName: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  qr: { dataUrl: string; generatedAt: string } | null;
}

export interface MessagingProvider {
  readonly channel: MessagingChannel;

  /** Inicia (o reanuda) la sesión de una empresa. Genera QR si no hay credenciales. */
  startSession(companyId: string): Promise<MessagingSessionStatus>;

  /** Cierra la sesión. Con logout=true desvincula el dispositivo y borra credenciales. */
  stopSession(companyId: string, opts?: { logout?: boolean }): Promise<void>;

  /** Reinicia la sesión reutilizando las credenciales almacenadas. */
  restartSession(companyId: string): Promise<MessagingSessionStatus>;

  /** Estado actual de la sesión (BD + runtime + QR vigente). */
  getSessionStatus(companyId: string): Promise<MessagingSessionStatus>;

  /** Envía un mensaje de texto al destinatario indicado. */
  sendMessage(
    companyId: string,
    to: string,
    text: string,
    opts?: { logAs?: string },
  ): Promise<void>;

  /** Suscripción a eventos del proveedor. */
  on(
    event: MessagingEvent,
    handler: (payload: QrPayload | SessionEventPayload | MessageEventPayload) => void,
  ): void;
}
