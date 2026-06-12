import { Module } from '@nestjs/common';
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

// ── DTOs ──
class CreateResourceDto {
  @IsString() name: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
class UpdateResourceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

// ── Service ──
@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  create(companyId: string, dto: CreateResourceDto) {
    return this.prisma.resource.create({
      data: {
        companyId,
        name: dto.name,
        type: dto.type ?? null,
        capacity: dto.capacity ?? 1,
        active: dto.active ?? true,
      },
    });
  }

  findAll(companyId: string) {
    return this.prisma.resource.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(companyId: string, id: string, dto: UpdateResourceDto) {
    const r = await this.prisma.resource.findFirst({ where: { id, companyId } });
    if (!r) throw new NotFoundException('Recurso no encontrado');
    return this.prisma.resource.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        type: dto.type ?? undefined,
        capacity: dto.capacity ?? undefined,
        active: dto.active ?? undefined,
      },
    });
  }

  async remove(companyId: string, id: string) {
    const r = await this.prisma.resource.findFirst({ where: { id, companyId } });
    if (!r) throw new NotFoundException('Recurso no encontrado');
    await this.prisma.resource.delete({ where: { id } });
    return { message: 'Recurso eliminado' };
  }
}

// ── Controller ──
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  @Get()
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.resourcesService.findAll(companyId);
  }

  @Roles('ADMIN')
  @Post()
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateResourceDto) {
    return this.resourcesService.create(companyId, dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return this.resourcesService.update(companyId, id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.resourcesService.remove(companyId, id);
  }
}

@Module({
  imports: [PrismaModule],
  providers: [ResourcesService],
  controllers: [ResourcesController],
  exports: [ResourcesService],
})
export class ResourcesModule {}
