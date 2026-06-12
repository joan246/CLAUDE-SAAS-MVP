import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  async check() {
    const dbHealth = await this.healthService.checkDatabase();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealth,
    };
  }
}
