// src/orders/dto/update-order-status.dto.ts
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client'; // auto-generated enums

export class UpdateOrderStatusDto {
    @ApiPropertyOptional({ 
        enum: OrderStatus, 
        example: 'shipped',
        description: 'Order status (pending, confirmed, processing, shipped, delivered, cancelled, refunded)'
    })
    @IsOptional()
    @IsEnum(OrderStatus, { message: 'Invalid order status' })
    status?: OrderStatus;

    @ApiPropertyOptional({ 
        enum: PaymentStatus, 
        example: 'completed',
        description: 'Payment status (pending, completed, failed, refunded)'
    })
    @IsOptional()
    @IsEnum(PaymentStatus, { message: 'Invalid payment status' })
    paymentStatus?: PaymentStatus;
}
