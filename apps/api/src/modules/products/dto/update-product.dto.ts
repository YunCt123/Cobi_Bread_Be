import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StorageType } from '@prisma/client';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  netWeightG?: number;

  @IsEnum(StorageType)
  @IsOptional()
  storageType?: StorageType;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  shelfLifeFrozenDays?: number | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  shelfLifeChilledDays?: number;

  @IsBoolean()
  @IsOptional()
  isB2b?: boolean;

  @IsString()
  @IsOptional()
  ingredients?: string;

  @IsString()
  @IsOptional()
  ingredientsEn?: string;

  @IsOptional()
  nutritionJson?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
