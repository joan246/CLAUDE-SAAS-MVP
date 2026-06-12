import { IsOptional, IsString, IsEmail, IsBoolean, IsDateString } from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() vip?: boolean;
  @IsOptional() @IsDateString() birthday?: string;
}
