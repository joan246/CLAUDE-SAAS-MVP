import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string;

  @IsOptional() @IsNumber() @Min(0) price?: number;

  @IsInt() @Min(5) duration: number; // minutos

  @IsOptional() @IsInt() @Min(0) prepTime?: number;
  @IsOptional() @IsInt() @Min(0) cleanupTime?: number;
  @IsOptional() @IsInt() @Min(0) buffer?: number;

  @IsOptional() @IsBoolean() active?: boolean;
}
