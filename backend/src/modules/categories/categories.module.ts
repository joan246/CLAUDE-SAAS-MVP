import { Module, Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

class CategoryDto {
  @IsString() name: string;
  @IsOptional() @IsString() color?: string;
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(companyId: string, dto: CategoryDto) {
    return this.prisma.serviceCategory.create({
      data: { companyId, name: dto.name, color: dto.color ?? null },
    });
  }

  findAll(companyId: string) {
    return this.prisma.serviceCategory.findMany({
      where: { companyId },
      include: { _count: { select: { services: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async update(companyId: string, id: string, dto: CategoryDto) {
    const c = await this.prisma.serviceCategory.findFirst({ where: { id, companyId } });
    if (!c) throw new NotFoundException('Categoría no encontrada');
    return this.prisma.serviceCategory.update({
      where: { id },
      data: { name: dto.name ?? undefined, color: dto.color ?? undefined },
    });
  }

  async remove(companyId: string, id: string) {
    const c = await this.prisma.serviceCategory.findFirst({ where: { id, companyId } });
    if (!c) throw new NotFoundException('Categoría no encontrada');
    await this.prisma.serviceCategory.delete({ where: { id } });
    return { message: 'Categoría eliminada' };
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.categoriesService.findAll(companyId);
  }

  @Roles('ADMIN')
  @Post()
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CategoryDto) {
    return this.categoriesService.create(companyId, dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: CategoryDto,
  ) {
    return this.categoriesService.update(companyId, id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.categoriesService.remove(companyId, id);
  }
}

@Module({
  imports: [PrismaModule],
  providers: [CategoriesService],
  controllers: [CategoriesController],
  exports: [CategoriesService],
})
export class CategoriesModule {}
