
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateDeliveryChargeDto {
    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => Number(value))
    deliveryCharge: number;
}
