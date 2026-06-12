import {
  Module,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  Min,
} from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CampaignTrigger, CampaignChannel, AppointmentStatus } from '@prisma/client';

// ── DTOs ──
class CampaignDto {
  @IsString() name: string;
  @IsOptional() @IsEnum(['INACTIVITY', 'VIP', 'BIRTHDAY', 'POST_VISIT', 'CUSTOM'])
  trigger?: CampaignTrigger;
  @IsOptional() @IsEnum(['WHATSAPP', 'EMAIL', 'SMS', 'INSTAGRAM'])
  channel?: CampaignChannel;
  @IsOptional() @IsInt() @Min(1) inactivityDays?: number;
  @IsOptional() @IsString() messageTemplate?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  create(companyId: string, dto: CampaignDto) {
    return this.prisma.campaign.create({
      data: {
        companyId,
        name: dto.name,
        trigger: (dto.trigger as CampaignTrigger) ?? 'INACTIVITY',
        channel: (dto.channel as CampaignChannel) ?? 'WHATSAPP',
        inactivityDays: dto.inactivityDays ?? 30,
        messageTemplate: dto.messageTemplate ?? undefined,
        active: dto.active ?? true,
      },
    });
  }

  findAll(companyId: string) {
    return this.prisma.campaign.findMany({
      where: { companyId },
      include: { _count: { select: { sends: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(companyId: string, id: string, dto: CampaignDto) {
    await this.ensure(companyId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        trigger: (dto.trigger as CampaignTrigger) ?? undefined,
        channel: (dto.channel as CampaignChannel) ?? undefined,
        inactivityDays: dto.inactivityDays ?? undefined,
        messageTemplate: dto.messageTemplate ?? undefined,
        active: dto.active ?? undefined,
      },
    });
  }

  async remove(companyId: string, id: string) {
    await this.ensure(companyId, id);
    await this.prisma.campaign.delete({ where: { id } });
    return { message: 'Campaña eliminada' };
  }

  /**
   * Segmentation engine — returns the customers that match a campaign's trigger.
   * (No external sending; that's a future integration.)
   */
  async evaluateTargets(companyId: string, id: string) {
    const campaign = await this.ensure(companyId, id);
    const customers = await this.prisma.customer.findMany({
      where: { companyId },
      include: {
        appointments: {
          where: { status: AppointmentStatus.COMPLETED },
          orderBy: { startTime: 'desc' },
          select: { startTime: true },
        },
      },
    });

    const now = new Date();
    let targets = customers;

    if (campaign.trigger === 'INACTIVITY') {
      const days = campaign.inactivityDays ?? 30;
      const cutoff = new Date(now.getTime() - days * 86400000);
      targets = customers.filter((c) => {
        const last = c.appointments[0]?.startTime;
        return last ? last < cutoff : c.createdAt < cutoff;
      });
    } else if (campaign.trigger === 'VIP') {
      targets = customers.filter((c) => c.vip || c.appointments.length >= 5);
    } else if (campaign.trigger === 'BIRTHDAY') {
      targets = customers.filter((c) => {
        if (!c.birthday) return false;
        const b = new Date(c.birthday);
        return b.getMonth() === now.getMonth() && b.getDate() === now.getDate();
      });
    }

    return {
      campaign: { id: campaign.id, name: campaign.name, trigger: campaign.trigger },
      count: targets.length,
      customers: targets.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        visits: c.appointments.length,
        lastVisit: c.appointments[0]?.startTime ?? null,
      })),
    };
  }

  /** Queues sends (architecture) — records PENDING CampaignSend rows. */
  async queue(companyId: string, id: string) {
    const { customers } = await this.evaluateTargets(companyId, id);
    const campaign = await this.ensure(companyId, id);
    if (customers.length) {
      await this.prisma.campaignSend.createMany({
        data: customers.map((c) => ({
          campaignId: id,
          customerId: c.id,
          channel: campaign.channel,
          status: 'PENDING',
        })),
      });
    }
    await this.prisma.campaign.update({
      where: { id },
      data: { lastRunAt: new Date() },
    });
    return { queued: customers.length };
  }

  private async ensure(companyId: string, id: string) {
    const c = await this.prisma.campaign.findFirst({ where: { id, companyId } });
    if (!c) throw new NotFoundException('Campaña no encontrada');
    return c;
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Get()
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.campaignsService.findAll(companyId);
  }

  @Get(':id/targets')
  targets(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.campaignsService.evaluateTargets(companyId, id);
  }

  @Roles('ADMIN')
  @Post()
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CampaignDto) {
    return this.campaignsService.create(companyId, dto);
  }

  @Roles('ADMIN')
  @Post(':id/queue')
  queue(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.campaignsService.queue(companyId, id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: CampaignDto,
  ) {
    return this.campaignsService.update(companyId, id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.campaignsService.remove(companyId, id);
  }
}

@Module({
  imports: [PrismaModule],
  providers: [CampaignsService],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
