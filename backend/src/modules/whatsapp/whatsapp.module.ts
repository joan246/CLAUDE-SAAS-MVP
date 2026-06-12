import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppGateway } from './whatsapp.gateway';
import { GroqService } from './groq.service';
import { SessionManager } from './session-manager';
import { QRManager } from './qr-manager';
import { MessageListener } from './message-listener';
import { MessageSender } from './message-sender';
import { WhatsAppLinkedDeviceProvider } from './whatsapp-linked-device.provider';
import { CampaignDispatcherService } from './campaign-dispatcher.service';
import { MESSAGING_PROVIDER } from '../messaging/messaging-provider.interface';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CustomersModule } from '../customers/customers.module';
import { AppointmentsModule } from '../appointments/appointments.module';

/**
 * Módulo de WhatsApp — autocontenido y desacoplado del resto del SaaS.
 *
 * Transporte:   SessionManager + QRManager + MessageSender + MessageListener
 * Tiempo real:  WhatsAppGateway (Socket.IO, rooms por empresa)
 * Abstracción:  MESSAGING_PROVIDER → WhatsAppLinkedDeviceProvider
 *               (sustituible por Cloud API / Instagram / Telegram sin tocar consumidores)
 * Negocio:      WhatsAppService (agente IA, modo humano, historial)
 * Remarketing:  CampaignDispatcherService (envía CampaignSend pendientes)
 */
@Module({
  imports: [
    HttpModule,
    PrismaModule,
    CustomersModule,
    AppointmentsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret-key',
    }),
  ],
  providers: [
    QRManager,
    SessionManager,
    MessageSender,
    WhatsAppLinkedDeviceProvider,
    { provide: MESSAGING_PROVIDER, useExisting: WhatsAppLinkedDeviceProvider },
    WhatsAppService,
    MessageListener,
    WhatsAppGateway,
    CampaignDispatcherService,
    GroqService,
  ],
  controllers: [WhatsAppController],
  exports: [WhatsAppService, GroqService, MESSAGING_PROVIDER],
})
export class WhatsAppModule {}
