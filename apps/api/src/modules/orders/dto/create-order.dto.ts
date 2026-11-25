import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryType, PaymentMethod } from '@prisma/client';

export class OrderItemInputDto {
  @IsString()
  @IsNotEmpty({ message: 'productId không được để trống' })
  productId!: string;

  @IsInt()
  @Min(1, { message: 'Số lượng phải tối thiểu là 1' })
  @Type(() => Number)
  quantity!: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'branchId không được để trống' })
  branchId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất 1 sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];

  @IsEnum(PaymentMethod, {
    message: 'paymentMethod phải là COD, VNPAY, MOMO hoặc BANK_TRANSFER',
  })
  paymentMethod!: PaymentMethod;

  @IsEnum(DeliveryType, {
    message: 'deliveryType phải là EXPRESS_NOW, SCHEDULED hoặc PICKUP',
  })
  deliveryType!: DeliveryType;

  @IsNotEmpty({ message: 'shippingAddress không được để trống' })
  shippingAddress!: Record<string, any>;

  @IsString()
  @IsOptional()
  note?: string;
}
