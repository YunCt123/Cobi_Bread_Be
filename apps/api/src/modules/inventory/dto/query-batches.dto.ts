import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryBatchesDto {
  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  expiringWithinDays?: number;
}
