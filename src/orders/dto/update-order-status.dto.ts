// src/orders/dto/update-order-status.dto.ts
import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus, PaymentStatus } from '@prisma/client'; // auto-generated enums

export class UpdateOrderStatusDto {
    @IsOptional()
    @IsEnum(OrderStatus, { message: 'Invalid order status' })
    status?: OrderStatus;

    @IsOptional()
    @IsEnum(PaymentStatus, { message: 'Invalid payment status' })
    paymentStatus?: PaymentStatus;
}
