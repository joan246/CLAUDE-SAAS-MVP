import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  Matches,
  Max,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStaffDto {
  @IsString()
  name: string;

  @IsOptional() @IsString() photo?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsInt() @Min(1) simultaneousCapacity?: number;
}

export class UpdateStaffDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() photo?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsInt() @Min(1) simultaneousCapacity?: number;
}

// ── Weekly schedule ──
export class StaffScheduleDayDto {
  @IsInt() @Min(0) @Max(6) dayOfWeek: number;
  @IsBoolean() isWorking: boolean;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) endTime: string;
}

export class SetStaffScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffScheduleDayDto)
  days: StaffScheduleDayDto[];
}

// ── Time off (vacaciones, ausencias, bloqueos) ──
export class CreateTimeOffDto {
  @IsEnum(['VACATION', 'ABSENCE', 'BLOCK', 'HOLIDAY'])
  type: 'VACATION' | 'ABSENCE' | 'BLOCK' | 'HOLIDAY';

  @IsDateString() start: string;
  @IsDateString() end: string;
  @IsOptional() @IsBoolean() allDay?: boolean;
  @IsOptional() @IsString() reason?: string;
}

// ── Specialties (servicios permitidos) ──
export class StaffServiceItemDto {
  @IsString() serviceId: string;
  @IsOptional() @IsInt() @Min(5) avgDuration?: number;
}

export class SetStaffServicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffServiceItemDto)
  services: StaffServiceItemDto[];
}
