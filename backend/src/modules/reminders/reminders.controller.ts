import { Controller, Post, UseGuards } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reminders')
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  /** Manual trigger for testing the reminder pipeline. */
  @UseGuards(JwtAuthGuard)
  @Post('run')
  async run() {
    const sent = await this.remindersService.sendDueReminders();
    return { sent };
  }
}
