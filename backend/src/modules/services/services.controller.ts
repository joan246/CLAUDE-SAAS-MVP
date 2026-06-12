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
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dtos/create-service.dto';
import {
  UpdateServiceDto,
  SetServiceResourcesDto,
} from './dtos/update-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.servicesService.findAll(companyId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.servicesService.findOne(companyId, id);
  }

  @Roles('ADMIN')
  @Post()
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesService.create(companyId, dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(companyId, id, dto);
  }

  @Roles('ADMIN')
  @Put(':id/resources')
  setResources(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: SetServiceResourcesDto,
  ) {
    return this.servicesService.setResources(companyId, id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.servicesService.remove(companyId, id);
  }
}
