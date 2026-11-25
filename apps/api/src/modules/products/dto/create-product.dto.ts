import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StorageType } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'SKU không được để trống' })
  sku!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  name!: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsNotEmpty({ message: 'categoryId không được để trống' })
  categoryId!: string;

  @IsInt()
  @Min(0, { message: 'Giá sản phẩm phải lớn hơn hoặc bằng 0' })
  @Type(() => Number)
  price!: number;

  @IsInt()
  @Min(0, { message: 'Trọng lượng (netWeightG) phải lớn hơn hoặc bằng 0' })
  @Type(() => Number)
  netWeightG!: number;

  @IsEnum(StorageType, {
    message: 'storageType phải là FRESH, FROZEN hoặc AMBIENT',
  })
  storageType!: StorageType;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  shelfLifeFrozenDays?: number | null;

  @IsInt()
  @Min(0, { message: 'Hạn dùng lạnh (shelfLifeChilledDays) phải lớn hơn hoặc bằng 0' })
  @Type(() => Number)
  shelfLifeChilledDays!: number;

  @IsBoolean()
  @IsOptional()
  isB2b?: boolean;

  @IsString()
  @IsNotEmpty({ message: 'Thành phần (ingredients) không được để trống' })
  ingredients!: string;

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
