import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  SetStaffScheduleDto,
  CreateTimeOffDto,
  SetStaffServicesDto,
} from './dtos/staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff')
export class StaffController {
  constructor(private staffService: StaffService) {}

  @Get()
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.staffService.findAll(companyId);
  }

  @Get(':id')
  findOne(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.staffService.findOne(companyId, id);
  }

  @Roles('ADMIN')
  @Post()
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateStaffDto) {
    return this.staffService.create(companyId, dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.update(companyId, id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.staffService.remove(companyId, id);
  }

  // ── Schedule ──
  @Get(':id/schedule')
  getSchedule(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.staffService.getSchedule(companyId, id);
  }

  @Roles('ADMIN')
  @Put(':id/schedule')
  setSchedule(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: SetStaffScheduleDto,
  ) {
    return this.staffService.setSchedule(companyId, id, dto);
  }

  // ── Time off ──
  @Get(':id/time-off')
  listTimeOff(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.staffService.listTimeOff(companyId, id);
  }

  @Roles('ADMIN')
  @Post(':id/time-off')
  addTimeOff(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: CreateTimeOffDto,
  ) {
    return this.staffService.addTimeOff(companyId, id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id/time-off/:timeOffId')
  removeTimeOff(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Param('timeOffId') timeOffId: string,
  ) {
    return this.staffService.removeTimeOff(companyId, id, timeOffId);
  }

  // ── Specialties ──
  @Get(':id/services')
  getServices(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.staffService.getServices(companyId, id);
  }

  @Roles('ADMIN')
  @Put(':id/services')
  setServices(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: SetStaffServicesDto,
  ) {
    return this.staffService.setServices(companyId, id, dto);
  }
}
