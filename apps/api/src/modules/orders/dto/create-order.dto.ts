import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: 'uuid-product-id' })
  @IsString()
  @IsNotEmpty({ message: 'productId không được để trống' })
  productId!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1, { message: 'Số lượng phải tối thiểu là 1' })
  @Type(() => Number)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: '7def3842-0cc6-4acf-8f23-dbafc5626786' })
  @IsString()
  @IsNotEmpty({ message: 'branchId không được để trống' })
  branchId!: string;

  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất 1 sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.COD })
  @IsEnum(PaymentMethod, {
    message: 'paymentMethod phải là COD, VNPAY, MOMO hoặc BANK_TRANSFER',
  })
  paymentMethod!: PaymentMethod;

  @ApiProperty({ enum: DeliveryType, example: DeliveryType.EXPRESS_NOW })
  @IsEnum(DeliveryType, {
    message: 'deliveryType phải là EXPRESS_NOW, SCHEDULED hoặc PICKUP',
  })
  deliveryType!: DeliveryType;

  @ApiProperty({
    example: {
      recipientName: 'Khách hàng Cobi Bread',
      phone: '0909888777',
      address: '69 Hoàng Văn Thái, Quận 7, TP.HCM',
    },
  })
  @IsNotEmpty({ message: 'shippingAddress không được để trống' })
  shippingAddress!: Record<string, any>;

  @ApiPropertyOptional({ example: 'Giao giờ hành chính, giữ lạnh giúp mình' })
  @IsString()
  @IsOptional()
  note?: string;
}
