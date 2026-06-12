import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { UpdateCustomerDto } from './dtos/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(companyId, dto);
  }

  @Get()
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.customersService.findAll(companyId);
  }

  @Get('by-phone/:phone')
  findByPhone(
    @CurrentUser('companyId') companyId: string,
    @Param('phone') phone: string,
  ) {
    return this.customersService.findByPhone(companyId, phone);
  }

  @Get(':id')
  findById(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.findById(companyId, id);
  }

  @Get(':id/history')
  getHistory(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.getCustomerHistory(companyId, id);
  }

  @Get(':id/profile')
  getProfile(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.getProfile(companyId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(companyId, id, dto);
  }

  @Delete(':id')
  delete(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.delete(companyId, id);
  }
}
