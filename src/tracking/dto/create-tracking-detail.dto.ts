import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTrackingDetailDto {
    @IsString()
    @IsNotEmpty()
    orderId: string;

    @IsString()
    @IsNotEmpty()
    carrier: string;

    @IsString()
    @IsNotEmpty()
    trackingNumber: string;

    @IsString()
    @IsOptional()
    trackingUrl?: string;
}
