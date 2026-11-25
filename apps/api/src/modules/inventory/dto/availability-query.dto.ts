import { IsNotEmpty, IsString } from 'class-validator';

export class AvailabilityQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'branchId là bắt buộc' })
  branchId!: string;

  @IsString()
  @IsNotEmpty({ message: 'productId là bắt buộc' })
  productId!: string;
}
