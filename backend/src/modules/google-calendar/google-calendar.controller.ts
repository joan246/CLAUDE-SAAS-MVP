import {
  Controller,
  Get,
  Delete,
  Query,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { GoogleCalendarService } from './google-calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('google')
export class GoogleCalendarController {
  constructor(private googleService: GoogleCalendarService) {}

  /** Returns the consent URL the admin should be redirected to. */
  @UseGuards(JwtAuthGuard)
  @Get('auth-url')
  getAuthUrl(@CurrentUser('companyId') companyId: string) {
    return this.googleService.getAuthUrl(companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  getStatus(@CurrentUser('companyId') companyId: string) {
    return this.googleService.getStatus(companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('disconnect')
  disconnect(@CurrentUser('companyId') companyId: string) {
    return this.googleService.disconnect(companyId);
  }

  /**
   * OAuth redirect target. Public (Google calls it) — the tenant is identified
   * via the `state` param we set when generating the consent URL.
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (!code || !state) {
      throw new BadRequestException('Faltan parámetros de OAuth');
    }
    try {
      await this.googleService.handleCallback(code, state);
      return res.redirect(`${frontend}/settings?google=connected`);
    } catch {
      return res.redirect(`${frontend}/settings?google=error`);
    }
  }
}
