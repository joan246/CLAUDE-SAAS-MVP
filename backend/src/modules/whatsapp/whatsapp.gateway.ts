import { Logger, OnModuleInit } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { SessionManager } from './session-manager';
import { MessagingEvent } from '../messaging/messaging-provider.interface';

const RELAYED_EVENTS: MessagingEvent[] = [
  'qr_generated',
  'connected',
  'disconnected',
  'reconnecting',
  'message_received',
  'message_sent',
  'session_restored',
];

/**
 * WhatsAppGateway — canal en tiempo real hacia el panel de administración.
 * Cada socket se autentica con el JWT de la app y se une a la room de su
 * empresa; los eventos de sesión solo llegan al tenant correspondiente.
 */
@WebSocketGateway({
  namespace: '/whatsapp',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class WhatsAppGateway implements OnGatewayConnection, OnModuleInit {
  @WebSocketServer() server: Server;
  private logger = new Logger(WhatsAppGateway.name);

  constructor(
    private sessionManager: SessionManager,
    private jwtService: JwtService,
  ) {}

  onModuleInit() {
    for (const event of RELAYED_EVENTS) {
      this.sessionManager.events.on(event, (payload: { companyId: string }) => {
        this.server.to(this.room(payload.companyId)).emit(event, payload);
      });
    }
  }

  handleConnection(socket: Socket) {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || '').replace('Bearer ', '');
      const payload = this.jwtService.verify(token);
      if (!payload?.companyId) throw new Error('token sin companyId');
      socket.join(this.room(payload.companyId));
    } catch {
      this.logger.warn(`Socket ${socket.id} rechazado: token inválido`);
      socket.disconnect(true);
    }
  }

  private room(companyId: string) {
    return `company:${companyId}`;
  }
}
