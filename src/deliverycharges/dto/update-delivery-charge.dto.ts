
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class UpdateDeliveryChargeDto {
    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => Number(value))
    deliveryCharge: number;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === true || value === 'true')
    isFreeDeliveryEligible?: boolean;
}
