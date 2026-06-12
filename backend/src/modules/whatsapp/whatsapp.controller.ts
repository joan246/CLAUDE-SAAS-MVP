import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Delete,
  Inject,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  MESSAGING_PROVIDER,
  MessagingProvider,
} from '../messaging/messaging-provider.interface';

@UseGuards(JwtAuthGuard)
@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private whatsAppService: WhatsAppService,
    @Inject(MESSAGING_PROVIDER) private messaging: MessagingProvider,
  ) {}

  // ─────────────── Sesión (dispositivo vinculado) ───────────────

  /** Estado de conexión + QR vigente (si lo hay). */
  @Get('session')
  async getSession(@Request() req) {
    return this.messaging.getSessionStatus(req.user.companyId);
  }

  /** Inicia la vinculación: arranca el cliente y genera el QR. */
  @Post('session/connect')
  async connect(@Request() req) {
    return this.messaging.startSession(req.user.companyId);
  }

  /** Reinicia la sesión reutilizando las credenciales guardadas. */
  @Post('session/reconnect')
  async reconnect(@Request() req) {
    return this.messaging.restartSession(req.user.companyId);
  }

  /** Desvincula el dispositivo y borra las credenciales de la sesión. */
  @Delete('session')
  async disconnect(@Request() req) {
    await this.messaging.stopSession(req.user.companyId, { logout: true });
    return { success: true };
  }

  // ─────────────── Conversaciones / chat manual ───────────────

  @Get('conversations')
  async getConversations(@Request() req) {
    return this.whatsAppService.getConversations(req.user.companyId);
  }

  @Get('messages/:phoneNumber')
  async getMessages(@Request() req, @Param('phoneNumber') phoneNumber: string) {
    return this.whatsAppService.getMessages(req.user.companyId, phoneNumber);
  }

  @Post('send')
  async sendManualMessage(@Request() req, @Body() body: { phoneNumber: string; message: string }) {
    await this.whatsAppService.sendManualMessage(req.user.companyId, body.phoneNumber, body.message);
    return { success: true };
  }

  @Post('toggle-mode')
  async toggleMode(@Request() req, @Body() body: { phoneNumber: string; mode: 'AI' | 'HUMAN' }) {
    await this.whatsAppService.toggleBotMode(req.user.companyId, body.phoneNumber, body.mode);
    return { success: true };
  }
}
