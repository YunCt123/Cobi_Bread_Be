import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBatchDto {
  @IsInt()
  @Min(0, { message: 'Số lượng phải lớn hơn hoặc bằng 0' })
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @IsDateString({}, { message: 'manufacturedAt phải là chuỗi ISO Date hợp lệ' })
  @IsOptional()
  manufacturedAt?: string;

  @IsDateString({}, { message: 'expiresAt phải là chuỗi ISO Date hợp lệ' })
  @IsOptional()
  expiresAt?: string;
}
