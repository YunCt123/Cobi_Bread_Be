import { IsEnum } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, {
    message:
      'status phải là PENDING, PAID, CONFIRMED, PROCESSING, SHIPPING, DELIVERED hoặc CANCELLED',
  })
  status!: OrderStatus;
}
