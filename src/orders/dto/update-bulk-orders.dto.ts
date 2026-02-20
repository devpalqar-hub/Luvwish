import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, TrackingStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class BulkUpdateOrderStatusDto {

    @ApiProperty({
        enum: TrackingStatus,
        example: TrackingStatus.out_for_delivery,
        description: 'Current tracking status to filter orders'
    })
    @IsEnum(TrackingStatus)
    fromTrackingStatus: TrackingStatus;


    @ApiProperty({
        enum: TrackingStatus,
        example: TrackingStatus.delivered,
        description: 'New tracking status to update to'
    })
    @IsEnum(TrackingStatus)
    toTrackingStatus: TrackingStatus;


    @ApiProperty({
        enum: PaymentStatus,
        example: PaymentStatus.completed,
        required: false
    })
    @IsEnum(PaymentStatus)
    @IsOptional()
    paymentStatus?: PaymentStatus;
}
