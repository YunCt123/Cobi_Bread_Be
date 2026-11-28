import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';

export class QueryUsersDto {
  @ApiPropertyOptional({ enum: Role })
  @IsEnum(Role, {
    message: 'role phải là ADMIN, BRANCH_MANAGER hoặc CUSTOMER',
  })
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo email, họ tên hoặc SĐT' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class CreateManagerDto {
  @ApiProperty({ example: 'manager.hanoi@cobibread.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @ApiPropertyOptional({ example: '123456', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @IsOptional()
  password?: string;

  @ApiProperty({ example: 'Quản lý AEON Hà Đông' })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullName!: string;

  @ApiPropertyOptional({ example: '0903456789' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: '06aa753f-4daa-40c7-b67c-9106e47ec43e' })
  @IsString()
  @IsNotEmpty({ message: 'branchId không được để trống' })
  branchId!: string;
}

export class UpdateUserStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean({ message: 'isActive phải là kiểu boolean' })
  isActive!: boolean;
}

export class UpdateUserBranchDto {
  @ApiProperty({ example: '7def3842-0cc6-4acf-8f23-dbafc5626786' })
  @IsString()
  @IsNotEmpty({ message: 'branchId không được để trống' })
  branchId!: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Khách hàng Cobi Bread' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: '0909888777' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: [
      {
        id: 'addr-1',
        recipientName: 'Khách hàng Cobi Bread',
        phone: '0909888777',
        address: '69 Hoàng Văn Thái, Quận 7',
        city: 'TP. Hồ Chí Minh',
        isDefault: true,
      },
    ],
  })
  @IsArray({ message: 'addresses phải là một mảng danh sách địa chỉ' })
  @IsOptional()
  addresses?: Record<string, any>[];
}
