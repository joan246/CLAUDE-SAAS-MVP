import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateServiceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsInt() @Min(5) duration?: number;
  @IsOptional() @IsInt() @Min(0) prepTime?: number;
  @IsOptional() @IsInt() @Min(0) cleanupTime?: number;
  @IsOptional() @IsInt() @Min(0) buffer?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

// ── Required resources for a service ──
export class ServiceResourceItemDto {
  @IsString() resourceId: string;
  @IsOptional() @IsInt() @Min(1) quantity?: number;
}

export class SetServiceResourcesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceResourceItemDto)
  resources: ServiceResourceItemDto[];
}
