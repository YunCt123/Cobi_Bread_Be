import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên chi nhánh không được để trống' })
  name!: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  address!: string;

  @IsString()
  @IsOptional()
  addressEn?: string;

  @IsString()
  @IsNotEmpty({ message: 'Thành phố không được để trống' })
  city!: string;

  @IsString()
  @IsOptional()
  cityEn?: string;

  @IsString()
  @IsNotEmpty({ message: 'Giờ mở cửa không được để trống' })
  openHours!: string;

  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone!: string;

  @IsString()
  @IsOptional()
  mapEmbedUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBranchDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  addressEn?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  cityEn?: string;

  @IsString()
  @IsOptional()
  openHours?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  mapEmbedUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
