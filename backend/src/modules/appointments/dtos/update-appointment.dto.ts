import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
  status?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
