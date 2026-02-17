import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, TrackingStatus } from '@prisma/client';
import {
    IsArray,
    IsEnum,
    IsUUID,
    ArrayNotEmpty,
} from 'class-validator';

export class BulkUpdateOrderStatusDto {
    @ApiProperty({
        description: 'List of order IDs to update',
        example: [
            '8c7a4f92-7b2b-4e6f-8bfa-5eac3b1c2a11',
            '0f1b2c3d-9a8b-4c6e-a123-9f7a5b2d4e88',
        ],
        type: [String],
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID('4', { each: true })
    orderIds: string[];

    @ApiProperty({
        description: 'Tracking status to update',
        enum: TrackingStatus,
        example: TrackingStatus.out_for_delivery,
    })
    @IsEnum(TrackingStatus)
    status: TrackingStatus;

    @ApiProperty({
        description: 'Payment status to update',
        enum: PaymentStatus,
        example: PaymentStatus.completed,
    })
    @IsEnum(PaymentStatus)
    paymentStatus: PaymentStatus;
}
