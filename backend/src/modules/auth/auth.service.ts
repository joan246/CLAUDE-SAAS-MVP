import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /** Turns "Bella Nails" into a unique slug like "bella-nails" / "bella-nails-2". */
  private async generateSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // strip accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'empresa';

    let slug = base;
    let counter = 1;
    while (await this.prisma.company.findUnique({ where: { slug } })) {
      counter += 1;
      slug = `${base}-${counter}`;
    }
    return slug;
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('Ya existe un usuario con ese email');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const companyName = dto.companyName || dto.name;
    const slug = await this.generateSlug(companyName);

    // Create the tenant (company) + admin user + sensible defaults atomically.
    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          slug,
          // Default weekly schedule: Mon–Fri open, weekend closed.
          businessHours: {
            create: Array.from({ length: 7 }).map((_, dayOfWeek) => ({
              dayOfWeek,
              isOpen: dayOfWeek >= 1 && dayOfWeek <= 5,
              startTime: '09:00',
              endTime: '18:00',
            })),
          },
          aiConfig: { create: {} },
          cancellationPolicy: { create: {} },
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          role: 'ADMIN',
        },
      });

      return { company, user };
    });

    return this.buildAuthResponse(result.user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.buildAuthResponse(user);
  }

  /** Resolves the user used by JwtStrategy.validate — must include tenant + role. */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return user;
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
  }) {
    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }
}
