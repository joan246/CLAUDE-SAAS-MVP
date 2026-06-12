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
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  IsIn,
} from 'class-validator';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

// ── DTOs ──
class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsIn(['ADMIN', 'STAFF']) role: UserRole;
  @IsOptional() @IsString() staffId?: string;
}
class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(['ADMIN', 'STAFF']) role?: UserRole;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsString() staffId?: string; // '' to unlink
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: {
        id: true, name: true, email: true, role: true, staffId: true,
        createdAt: true, staff: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(companyId: string, dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Ya existe un usuario con ese email');

    if (dto.staffId) await this.assertStaffLinkable(companyId, dto.staffId);

    const user = await this.prisma.user.create({
      data: {
        companyId,
        name: dto.name,
        email: dto.email,
        password: await bcrypt.hash(dto.password, 10),
        role: dto.role,
        staffId: dto.staffId || null,
      },
      select: { id: true, name: true, email: true, role: true, staffId: true },
    });
    return user;
  }

  async update(companyId: string, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.staffId) await this.assertStaffLinkable(companyId, dto.staffId, id);

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        role: dto.role ?? undefined,
        staffId: dto.staffId === undefined ? undefined : dto.staffId || null,
        ...(dto.password ? { password: await bcrypt.hash(dto.password, 10) } : {}),
      },
      select: { id: true, name: true, email: true, role: true, staffId: true },
    });
  }

  async remove(companyId: string, currentUserId: string, id: string) {
    if (id === currentUserId) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }
    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Don't allow removing the last admin.
    if (user.role === 'ADMIN') {
      const admins = await this.prisma.user.count({
        where: { companyId, role: 'ADMIN' },
      });
      if (admins <= 1) throw new BadRequestException('Debe quedar al menos un administrador');
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'Usuario eliminado' };
  }

  private async assertStaffLinkable(companyId: string, staffId: string, ignoreUserId?: string) {
    const staff = await this.prisma.staff.findFirst({ where: { id: staffId, companyId } });
    if (!staff) throw new BadRequestException('Empleado no válido');
    const linked = await this.prisma.user.findUnique({ where: { staffId } });
    if (linked && linked.id !== ignoreUserId) {
      throw new BadRequestException('Ese empleado ya tiene un usuario vinculado');
    }
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  list(@CurrentUser('companyId') companyId: string) {
    return this.usersService.list(companyId);
  }

  @Post()
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(companyId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(companyId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') currentUserId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.remove(companyId, currentUserId, id);
  }
}

@Module({
  imports: [PrismaModule],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
