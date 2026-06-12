import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcodeTerminal from 'qrcode-terminal';
import { WhatsAppSessionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { QRManager } from './qr-manager';

interface ManagedSession {
  client: Client;
  status: WhatsAppSessionStatus;
  /** true si en esta inicialización se mostró QR (distingue connected de session_restored) */
  qrSeen: boolean;
  /** teardown iniciado por el usuario: no auto-reconectar */
  tearingDown: boolean;
  reconnectAttempts: number;
}

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 5_000;
/** Pausa entre arranques de Chromium al restaurar varias sesiones en el boot. */
const RESTORE_STAGGER_MS = 2_000;

/**
 * SessionManager — una sesión whatsapp-web.js por empresa, completamente aislada.
 *
 * - Credenciales en disco vía LocalAuth (clientId = company-<id>) bajo WA_DATA_PATH,
 *   montado como volumen Docker para sobrevivir reinicios.
 * - Al arrancar el servidor restaura automáticamente las sesiones que estaban
 *   conectadas, sin pedir QR (evento session_restored).
 * - Reconexión automática con backoff ante caídas no iniciadas por el usuario.
 *
 * Emite por `events`: qr_generated, connected, disconnected, reconnecting,
 * session_restored y el evento interno 'message' (Message crudo para MessageListener).
 */
@Injectable()
export class SessionManager implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(SessionManager.name);
  private sessions = new Map<string, ManagedSession>();
  readonly events = new EventEmitter();
  private readonly dataPath =
    process.env.WA_DATA_PATH || path.resolve(process.cwd(), 'storage', 'whatsapp');

  constructor(
    private prisma: PrismaService,
    private qrManager: QRManager,
  ) {
    // Varias empresas pueden tener listeners (gateway + listener interno)
    this.events.setMaxListeners(50);
  }

  async onModuleInit() {
    if (process.env.SKIP_WA === 'true') {
      this.logger.log('SKIP_WA=true — sesiones de WhatsApp deshabilitadas');
      return;
    }
    await fs.mkdir(this.dataPath, { recursive: true });
    // No bloquear el arranque de Nest mientras se levantan los navegadores
    this.restorePersistedSessions().catch((e) =>
      this.logger.error(`Error restaurando sesiones: ${e}`),
    );
  }

  async onModuleDestroy() {
    for (const [companyId, session] of this.sessions) {
      session.tearingDown = true;
      try {
        await session.client.destroy();
      } catch {
        // teardown best-effort
      }
      this.logger.log(`Sesión de ${companyId} detenida por apagado del servidor`);
    }
    this.sessions.clear();
  }

  /** Restaura al boot todas las sesiones que quedaron vinculadas. */
  private async restorePersistedSessions() {
    const rows = await this.prisma.whatsAppSession.findMany({
      where: {
        status: {
          in: [
            WhatsAppSessionStatus.CONNECTED,
            WhatsAppSessionStatus.RECONNECTING,
            WhatsAppSessionStatus.INITIALIZING,
          ],
        },
      },
    });
    if (rows.length === 0) return;
    this.logger.log(`Restaurando ${rows.length} sesión(es) de WhatsApp…`);
    for (const row of rows) {
      try {
        await this.startSession(row.companyId);
      } catch (e) {
        this.logger.error(`No se pudo restaurar la sesión de ${row.companyId}: ${e}`);
      }
      await new Promise((r) => setTimeout(r, RESTORE_STAGGER_MS));
    }
  }

  // ─────────────────────────── API pública ───────────────────────────

  /** Inicia la sesión de una empresa. Idempotente: si ya está activa no hace nada. */
  async startSession(companyId: string): Promise<WhatsAppSessionStatus> {
    const existing = this.sessions.get(companyId);
    if (existing && existing.status !== WhatsAppSessionStatus.DISCONNECTED) {
      return existing.status;
    }

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: `company-${companyId}`,
        dataPath: this.dataPath,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      },
    });

    const session: ManagedSession = {
      client,
      status: WhatsAppSessionStatus.INITIALIZING,
      qrSeen: false,
      tearingDown: false,
      reconnectAttempts: 0,
    };
    this.sessions.set(companyId, session);
    this.wireClientEvents(companyId, session);

    await this.persistStatus(companyId, WhatsAppSessionStatus.INITIALIZING);
    this.logger.log(`[${companyId}] Inicializando cliente de WhatsApp…`);

    client.initialize().catch(async (err) => {
      this.logger.error(`[${companyId}] Error inicializando: ${err?.message || err}`);
      await this.markDisconnected(companyId, 'init_error');
    });

    return session.status;
  }

  /**
   * Detiene la sesión. Con logout=true desvincula el dispositivo de la cuenta
   * de WhatsApp y borra las credenciales locales (pedirá QR la próxima vez).
   */
  async stopSession(companyId: string, opts: { logout?: boolean } = {}) {
    const session = this.sessions.get(companyId);
    if (session) {
      session.tearingDown = true;
      if (opts.logout) {
        try {
          await session.client.logout();
        } catch (e) {
          this.logger.warn(`[${companyId}] logout falló (se continúa): ${e}`);
        }
      }
      try {
        await session.client.destroy();
      } catch {
        // el navegador pudo haber muerto ya
      }
      this.sessions.delete(companyId);
    }
    if (opts.logout) {
      await this.deleteAuthDir(companyId);
    }
    this.qrManager.clear(companyId);
    await this.persistStatus(companyId, WhatsAppSessionStatus.DISCONNECTED, {
      clearIdentity: !!opts.logout,
    });
    this.emit('disconnected', { companyId, reason: opts.logout ? 'logout' : 'stopped' });
    this.logger.log(`[${companyId}] Sesión detenida${opts.logout ? ' y desvinculada' : ''}`);
  }

  /** Reinicia la sesión reutilizando las credenciales guardadas (sin nuevo QR). */
  async restartSession(companyId: string): Promise<WhatsAppSessionStatus> {
    const session = this.sessions.get(companyId);
    if (session) {
      session.tearingDown = true;
      try {
        await session.client.destroy();
      } catch {
        // ignorar: solo queremos un arranque limpio
      }
      this.sessions.delete(companyId);
    }
    return this.startSession(companyId);
  }

  getClient(companyId: string): Client | null {
    const session = this.sessions.get(companyId);
    if (!session || session.status !== WhatsAppSessionStatus.CONNECTED) return null;
    return session.client;
  }

  getRuntimeStatus(companyId: string): WhatsAppSessionStatus {
    return this.sessions.get(companyId)?.status ?? WhatsAppSessionStatus.DISCONNECTED;
  }

  /** Marca actividad de la sesión (mensajes in/out) para "última sincronización". */
  async touchLastSync(companyId: string) {
    await this.prisma.whatsAppSession
      .update({ where: { companyId }, data: { lastSyncAt: new Date() } })
      .catch(() => undefined); // la fila puede no existir aún
  }

  // ─────────────────────────── Eventos del cliente ───────────────────────────

  private wireClientEvents(companyId: string, session: ManagedSession) {
    const { client } = session;

    client.on('qr', async (qr) => {
      session.qrSeen = true;
      session.status = WhatsAppSessionStatus.QR_PENDING;
      const stored = await this.qrManager.set(companyId, qr);
      await this.prisma.whatsAppSession
        .update({
          where: { companyId },
          data: { status: WhatsAppSessionStatus.QR_PENDING, lastQrAt: stored.generatedAt },
        })
        .catch(() => undefined);
      this.emit('qr_generated', {
        companyId,
        qr,
        qrDataUrl: stored.dataUrl,
        generatedAt: stored.generatedAt.toISOString(),
      });
      this.logger.log(`[${companyId}] QR generado (también visible abajo):`);
      qrcodeTerminal.generate(qr, { small: true });
    });

    client.on('ready', async () => {
      session.status = WhatsAppSessionStatus.CONNECTED;
      session.reconnectAttempts = 0;
      this.qrManager.clear(companyId);

      const phoneNumber = client.info?.wid?.user ?? null;
      const displayName = client.info?.pushname ?? null;
      const now = new Date();
      const restored = !session.qrSeen;

      const current = await this.prisma.whatsAppSession.findUnique({ where: { companyId } });
      await this.prisma.whatsAppSession.upsert({
        where: { companyId },
        create: {
          companyId,
          status: WhatsAppSessionStatus.CONNECTED,
          phoneNumber,
          displayName,
          connectedAt: now,
          lastSyncAt: now,
        },
        update: {
          status: WhatsAppSessionStatus.CONNECTED,
          phoneNumber,
          displayName,
          // conservar la fecha de vinculación original al restaurar/reconectar
          connectedAt: restored && current?.connectedAt ? current.connectedAt : now,
          lastSyncAt: now,
        },
      });

      this.emit(restored ? 'session_restored' : 'connected', {
        companyId,
        phoneNumber,
        displayName,
      });
      this.logger.log(
        `[${companyId}] WhatsApp ${restored ? 'restaurado' : 'conectado'} como +${phoneNumber}`,
      );
    });

    client.on('auth_failure', async (msg) => {
      this.logger.error(`[${companyId}] Fallo de autenticación: ${msg}`);
      this.sessions.delete(companyId);
      await this.deleteAuthDir(companyId);
      await this.markDisconnected(companyId, 'auth_failure');
    });

    client.on('disconnected', async (reason) => {
      if (session.tearingDown) return; // stop/restart explícito: ya gestionado
      this.logger.warn(`[${companyId}] Sesión desconectada: ${reason}`);

      const loggedOutFromPhone = String(reason).toUpperCase().includes('LOGOUT');
      if (loggedOutFromPhone) {
        // El usuario desvinculó el dispositivo desde su teléfono: credenciales inválidas
        this.sessions.delete(companyId);
        try {
          await client.destroy();
        } catch {
          // navegador ya cerrado
        }
        await this.deleteAuthDir(companyId);
        await this.markDisconnected(companyId, String(reason));
        return;
      }

      this.emit('disconnected', { companyId, reason: String(reason) });
      await this.attemptReconnect(companyId, session);
    });

    client.on('message', (message: Message) => {
      // Evento interno: MessageListener normaliza, registra y dispara la IA
      this.events.emit('message', companyId, message);
    });
  }

  private async attemptReconnect(companyId: string, session: ManagedSession) {
    while (session.reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !session.tearingDown) {
      session.reconnectAttempts += 1;
      session.status = WhatsAppSessionStatus.RECONNECTING;
      await this.persistStatus(companyId, WhatsAppSessionStatus.RECONNECTING);
      this.emit('reconnecting', { companyId, attempt: session.reconnectAttempts });
      this.logger.log(
        `[${companyId}] Reintentando conexión (${session.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})…`,
      );
      await new Promise((r) =>
        setTimeout(r, RECONNECT_BASE_DELAY_MS * session.reconnectAttempts),
      );
      try {
        await session.client.destroy().catch(() => undefined);
        this.sessions.delete(companyId);
        await this.startSession(companyId);
        return;
      } catch (e) {
        this.logger.error(`[${companyId}] Reintento fallido: ${e}`);
      }
    }
    if (!session.tearingDown) {
      this.sessions.delete(companyId);
      await this.markDisconnected(companyId, 'reconnect_exhausted');
    }
  }

  // ─────────────────────────── Helpers ───────────────────────────

  private emit(event: string, payload: Record<string, unknown>) {
    this.events.emit(event, payload);
  }

  private async markDisconnected(companyId: string, reason: string) {
    const session = this.sessions.get(companyId);
    if (session) session.status = WhatsAppSessionStatus.DISCONNECTED;
    this.qrManager.clear(companyId);
    await this.persistStatus(companyId, WhatsAppSessionStatus.DISCONNECTED);
    this.emit('disconnected', { companyId, reason });
  }

  private async persistStatus(
    companyId: string,
    status: WhatsAppSessionStatus,
    opts: { clearIdentity?: boolean } = {},
  ) {
    const identity = opts.clearIdentity
      ? { phoneNumber: null, displayName: null, connectedAt: null }
      : {};
    await this.prisma.whatsAppSession.upsert({
      where: { companyId },
      create: { companyId, status },
      update: { status, ...identity },
    });
  }

  private async deleteAuthDir(companyId: string) {
    const dir = path.join(this.dataPath, `session-company-${companyId}`);
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
