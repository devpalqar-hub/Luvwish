import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, TrackingStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsUUID,
    ArrayNotEmpty,
    IsString,
    IsOptional,
} from 'class-validator';

export class BulkUpdateOrderStatusDto {
    @ApiProperty({
        description: 'List of order IDs to update',
        type: [String],
        example: [
            '8c7a4f92-7b2b-4e6f-8bfa-5eac3b1c2a11',
            '0f1b2c3d-9a8b-4c6e-a123-9f7a5b2d4e88',
        ],
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID('4', { each: true })   // ✅ REQUIRED
    orderIds: string[];


    @ApiProperty({
        enum: TrackingStatus,
        example: TrackingStatus.out_for_delivery,
    })
    @IsEnum(TrackingStatus)
    status: TrackingStatus;

    @ApiProperty({
        enum: PaymentStatus,
        example: PaymentStatus.completed,
    })
    @IsEnum(PaymentStatus)
    paymentStatus: PaymentStatus;
}
