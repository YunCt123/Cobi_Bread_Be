import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { StorageType } from '@prisma/client';

export class QueryProductDto {
  @IsString()
  @IsOptional()
  categorySlug?: string;

  @IsEnum(StorageType, {
    message: 'storageType phải là FRESH, FROZEN hoặc AMBIENT',
  })
  @IsOptional()
  storageType?: StorageType;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isB2b?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  lang?: string = 'vi';

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
