import {
  Module,
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RuleKey } from '@prisma/client';

const ALL_KEYS: RuleKey[] = [
  'NO_SAME_DAY_BOOKING',
  'REQUIRE_DEPOSIT',
  'MAX_CANCELLATIONS',
  'NO_SHOW_PENALTY',
  'MIN_HOURS_BEFORE_BOOKING',
  'MAX_BOOKINGS_PER_DAY',
  'ALLOW_DOUBLE_BOOKING',
] as RuleKey[];

// ── DTOs ──
class RuleItemDto {
  @IsEnum([
    'NO_SAME_DAY_BOOKING',
    'REQUIRE_DEPOSIT',
    'MAX_CANCELLATIONS',
    'NO_SHOW_PENALTY',
    'MIN_HOURS_BEFORE_BOOKING',
    'MAX_BOOKINGS_PER_DAY',
    'ALLOW_DOUBLE_BOOKING',
  ])
  key: RuleKey;
  @IsBoolean() enabled: boolean;
  @IsOptional() @IsNumber() numValue?: number;
  @IsOptional() @IsString() strValue?: string;
}
class SetRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleItemDto)
  rules: RuleItemDto[];
}

@Injectable()
export class RulesService {
  constructor(private prisma: PrismaService) {}

  /** Returns every rule key (with stored config, or disabled defaults). */
  async getAll(companyId: string) {
    const stored = await this.prisma.businessRule.findMany({ where: { companyId } });
    const map = new Map(stored.map((r) => [r.key, r]));
    return ALL_KEYS.map(
      (key) =>
        map.get(key) ?? {
          key,
          companyId,
          enabled: false,
          numValue: null,
          strValue: null,
        },
    );
  }

  async setRules(companyId: string, dto: SetRulesDto) {
    await this.prisma.$transaction(
      dto.rules.map((r) =>
        this.prisma.businessRule.upsert({
          where: { companyId_key: { companyId, key: r.key } },
          create: {
            companyId,
            key: r.key,
            enabled: r.enabled,
            numValue: r.numValue ?? null,
            strValue: r.strValue ?? null,
          },
          update: {
            enabled: r.enabled,
            numValue: r.numValue ?? null,
            strValue: r.strValue ?? null,
          },
        }),
      ),
    );
    return this.getAll(companyId);
  }

  /** Enforced at booking time. */
  async assertBookingAllowed(
    companyId: string,
    start: Date,
    customer?: { lateCancellations: number },
  ) {
    const rules = await this.prisma.businessRule.findMany({
      where: { companyId, enabled: true },
    });
    const now = new Date();

    for (const rule of rules) {
      switch (rule.key) {
        case 'NO_SAME_DAY_BOOKING': {
          if (start.toDateString() === now.toDateString()) {
            throw new BadRequestException('No se permiten reservas para el mismo día');
          }
          break;
        }
        case 'MIN_HOURS_BEFORE_BOOKING': {
          const minH = rule.numValue ?? 0;
          if ((start.getTime() - now.getTime()) / 3600000 < minH) {
            throw new BadRequestException(
              `Las reservas requieren al menos ${minH}h de anticipación`,
            );
          }
          break;
        }
        case 'MAX_CANCELLATIONS': {
          const max = rule.numValue ?? 0;
          if (customer && max > 0 && customer.lateCancellations >= max) {
            throw new BadRequestException(
              'Este cliente superó el máximo de cancelaciones permitidas',
            );
          }
          break;
        }
        default:
          break;
      }
    }
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rules')
export class RulesController {
  constructor(private rulesService: RulesService) {}

  @Get()
  getAll(@CurrentUser('companyId') companyId: string) {
    return this.rulesService.getAll(companyId);
  }

  @Roles('ADMIN')
  @Put()
  setRules(@CurrentUser('companyId') companyId: string, @Body() dto: SetRulesDto) {
    return this.rulesService.setRules(companyId, dto);
  }
}

@Module({
  imports: [PrismaModule],
  providers: [RulesService],
  controllers: [RulesController],
  exports: [RulesService],
})
export class RulesModule {}
