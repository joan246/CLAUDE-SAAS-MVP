import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCancellationPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  minHoursBefore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  warningThreshold?: number;

  @IsOptional()
  @IsString()
  warningMessage?: string;

  @IsOptional()
  @IsString()
  penaltyMessage?: string;
}
