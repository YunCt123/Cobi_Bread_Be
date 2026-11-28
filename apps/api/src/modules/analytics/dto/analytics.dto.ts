import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TrackVisitDto {
  @ApiProperty({ example: '/products/banh-mi-kem-tuoi-pho-mai-75g' })
  @IsString()
  @IsNotEmpty({ message: 'path không được để trống' })
  path!: string;

  @ApiPropertyOptional({ example: 'sess-xyz-123' })
  @IsString()
  @IsOptional()
  sessionId?: string;
}

export class AdminOverviewQueryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d', '90d'], default: '30d' })
  @IsString()
  @IsIn(['7d', '30d', '90d'], {
    message: 'range phải là 7d, 30d hoặc 90d',
  })
  @IsOptional()
  range?: '7d' | '30d' | '90d' = '30d';
}

export class BranchOverviewQueryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d', '90d'], default: '30d' })
  @IsString()
  @IsIn(['7d', '30d', '90d'], {
    message: 'range phải là 7d, 30d hoặc 90d',
  })
  @IsOptional()
  range?: '7d' | '30d' | '90d' = '30d';

  @ApiPropertyOptional({
    description: 'Chi nhánh cần xem (ADMIN có thể truyền, BRANCH_MANAGER tự khóa theo JWT)',
  })
  @IsString()
  @IsOptional()
  branchId?: string;
}
