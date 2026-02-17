// src/orders/dto/update-order-status.dto.ts
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus, TrackingStatus } from '@prisma/client'; // auto-generated enums

export class UpdateOrderStatusDto {
    @ApiPropertyOptional({
        enum: TrackingStatus,
        example: 'shipped',
        description: 'Order status (pending, confirmed, processing, shipped, delivered, cancelled, refunded)'
    })
    @IsOptional()
    @IsEnum(TrackingStatus, { message: 'Invalid tracking status' })
    status?: TrackingStatus;

    @ApiPropertyOptional({
        enum: PaymentStatus,
        example: 'completed',
        description: 'Payment status (pending, completed, failed, refunded)'
    })
    @IsOptional()
    @IsEnum(PaymentStatus, { message: 'Invalid payment status' })
    paymentStatus?: PaymentStatus;
}
