import { IsString, IsNumber, ArrayNotEmpty, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDeliveryChargeDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    postalCodes: string[];


    @IsNumber()
    @Transform(({ value }) => Number(value))
    deliveryCharge: number;
}
