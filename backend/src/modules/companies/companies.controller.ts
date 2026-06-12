import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { UpdateBusinessHoursDto } from './dtos/business-hours.dto';
import { UpdateAiConfigDto } from './dtos/ai-config.dto';
import { UpdateCancellationPolicyDto } from './dtos/cancellation-policy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  // ── Profile ──
  @Get('me')
  getProfile(@CurrentUser('companyId') companyId: string) {
    return this.companiesService.getProfile(companyId);
  }

  @Roles('ADMIN')
  @Patch('me')
  updateProfile(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.updateProfile(companyId, dto);
  }

  // ── Business hours ──
  @Get('me/business-hours')
  getBusinessHours(@CurrentUser('companyId') companyId: string) {
    return this.companiesService.getBusinessHours(companyId);
  }

  @Roles('ADMIN')
  @Put('me/business-hours')
  updateBusinessHours(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateBusinessHoursDto,
  ) {
    return this.companiesService.updateBusinessHours(companyId, dto);
  }

  // ── AI config ──
  @Get('me/ai-config')
  getAiConfig(@CurrentUser('companyId') companyId: string) {
    return this.companiesService.getAiConfig(companyId);
  }

  @Roles('ADMIN')
  @Patch('me/ai-config')
  updateAiConfig(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateAiConfigDto,
  ) {
    return this.companiesService.updateAiConfig(companyId, dto);
  }

  // ── Knowledge Base ──
  @Get('me/knowledge')
  getKnowledgeDocuments(@CurrentUser('companyId') companyId: string) {
    return this.companiesService.getKnowledgeDocuments(companyId);
  }

  @Roles('ADMIN')
  @Post('me/knowledge')
  addKnowledgeDocument(
    @CurrentUser('companyId') companyId: string,
    @Body() body: { title: string; content: string },
  ) {
    return this.companiesService.addKnowledgeDocument(companyId, body.title, body.content);
  }

  @Roles('ADMIN')
  @Delete('me/knowledge/:id')
  deleteKnowledgeDocument(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.companiesService.deleteKnowledgeDocument(companyId, id);
  }

  // ── Cancellation policy ──
  @Get('me/cancellation-policy')
  getCancellationPolicy(@CurrentUser('companyId') companyId: string) {
    return this.companiesService.getCancellationPolicy(companyId);
  }

  @Roles('ADMIN')
  @Patch('me/cancellation-policy')
  updateCancellationPolicy(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateCancellationPolicyDto,
  ) {
    return this.companiesService.updateCancellationPolicy(companyId, dto);
  }
}
