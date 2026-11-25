import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  name!: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  displayOrder?: number;
}

export class UpdateCategoryDto {
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
  parentId?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  displayOrder?: number;
}
