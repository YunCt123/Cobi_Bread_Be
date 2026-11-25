import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBatchDto {
  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsNotEmpty({ message: 'productId không được để trống' })
  productId!: string;

  @IsString()
  @IsNotEmpty({ message: 'batchCode không được để trống' })
  batchCode!: string;

  @IsInt()
  @Min(1, { message: 'Số lượng phải tối thiểu là 1' })
  @Type(() => Number)
  quantity!: number;

  @IsDateString({}, { message: 'manufacturedAt phải là chuỗi ISO Date hợp lệ' })
  manufacturedAt!: string;

  @IsDateString({}, { message: 'expiresAt phải là chuỗi ISO Date hợp lệ' })
  expiresAt!: string;
}
