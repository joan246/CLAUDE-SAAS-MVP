import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from 'src/prisma/prisma.service';
import { utcToLocalParts } from 'src/common/timezone';

interface CalendarEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  timezone?: string;
}

@Injectable()
export class GoogleCalendarService {
  private logger = new Logger(GoogleCalendarService.name);

  constructor(private prisma: PrismaService) {}

  private isConfigured(): boolean {
    return !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  private baseClient(): OAuth2Client {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  // ── OAuth ────────────────────────────────────────────────────────────────
  getAuthUrl(companyId: string): { url: string } {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Google Calendar no está configurado en el servidor (faltan credenciales)',
      );
    }
    const url = this.baseClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // force refresh_token every time
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state: companyId, // round-trips the tenant id back to the callback
    });
    return { url };
  }

  async handleCallback(code: string, companyId: string) {
    if (!this.isConfigured()) {
      throw new BadRequestException('Google Calendar no está configurado');
    }
    const client = this.baseClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token) {
      throw new BadRequestException('No se pudo obtener el token de Google');
    }

    // Fetch the connected account email (best-effort).
    let email: string | undefined;
    try {
      client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const me = await oauth2.userinfo.get();
      email = me.data.email ?? undefined;
    } catch {
      /* non-fatal */
    }

    await this.prisma.googleCalendarAccount.upsert({
      where: { companyId },
      create: {
        companyId,
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? '',
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      update: {
        email,
        accessToken: tokens.access_token,
        // Keep the existing refresh token if Google didn't send a new one.
        ...(tokens.refresh_token
          ? { refreshToken: tokens.refresh_token }
          : {}),
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    return { connected: true, email };
  }

  async getStatus(companyId: string) {
    const account = await this.prisma.googleCalendarAccount.findUnique({
      where: { companyId },
      select: { email: true, calendarId: true },
    });
    return {
      configured: this.isConfigured(),
      connected: !!account,
      email: account?.email ?? null,
    };
  }

  async disconnect(companyId: string) {
    await this.prisma.googleCalendarAccount
      .delete({ where: { companyId } })
      .catch(() => null);
    return { connected: false };
  }

  // ── Authenticated client (with auto-refresh persistence) ─────────────────
  private async getCalendar(
    companyId: string,
  ): Promise<{ calendar: calendar_v3.Calendar; calendarId: string } | null> {
    if (!this.isConfigured()) return null;

    const account = await this.prisma.googleCalendarAccount.findUnique({
      where: { companyId },
    });
    if (!account) return null;

    const client = this.baseClient();
    client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.expiryDate?.getTime(),
    });

    // Persist refreshed tokens automatically.
    client.on('tokens', (tokens) => {
      this.prisma.googleCalendarAccount
        .update({
          where: { companyId },
          data: {
            ...(tokens.access_token
              ? { accessToken: tokens.access_token }
              : {}),
            ...(tokens.refresh_token
              ? { refreshToken: tokens.refresh_token }
              : {}),
            ...(tokens.expiry_date
              ? { expiryDate: new Date(tokens.expiry_date) }
              : {}),
          },
        })
        .catch((e) => this.logger.warn(`No se pudo refrescar token: ${e}`));
    });

    return {
      calendar: google.calendar({ version: 'v3', auth: client }),
      calendarId: account.calendarId,
    };
  }

  // ── Event CRUD (all no-op safe when not connected) ───────────────────────
  async createEvent(
    companyId: string,
    input: CalendarEventInput,
  ): Promise<string | null> {
    const ctx = await this.getCalendar(companyId);
    if (!ctx) return null;
    try {
      const res = await ctx.calendar.events.insert({
        calendarId: ctx.calendarId,
        requestBody: this.toEvent(input),
      });
      return res.data.id ?? null;
    } catch (e) {
      this.logger.error(`Error creando evento en Google Calendar: ${e}`);
      return null;
    }
  }

  async updateEvent(
    companyId: string,
    eventId: string,
    input: CalendarEventInput,
  ): Promise<void> {
    const ctx = await this.getCalendar(companyId);
    if (!ctx) return;
    try {
      await ctx.calendar.events.update({
        calendarId: ctx.calendarId,
        eventId,
        requestBody: this.toEvent(input),
      });
    } catch (e) {
      this.logger.error(`Error actualizando evento: ${e}`);
    }
  }

  async deleteEvent(companyId: string, eventId: string): Promise<void> {
    const ctx = await this.getCalendar(companyId);
    if (!ctx) return;
    try {
      await ctx.calendar.events.delete({
        calendarId: ctx.calendarId,
        eventId,
      });
    } catch (e) {
      this.logger.error(`Error eliminando evento: ${e}`);
    }
  }

  private toEvent(input: CalendarEventInput): calendar_v3.Schema$Event {
    const timeZone = input.timezone || 'America/Mexico_City';
    
    const getLocalISO = (d: Date) => {
      const parts = utcToLocalParts(d, timeZone);
      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.000`;
    };

    const startDateTime = getLocalISO(input.start);
    const endDateTime = getLocalISO(input.end);

    return {
      summary: input.summary,
      description: input.description,
      start: { dateTime: startDateTime, timeZone },
      end: { dateTime: endDateTime, timeZone },
    };
  }
}
