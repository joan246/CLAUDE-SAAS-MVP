import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  @MinLength(6)
  password: string;

  // Optional business name; falls back to the user's name if omitted.
  @IsOptional()
  @IsString()
  companyName?: string;
}
