// check-coupon.dto.ts
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CheckCouponDto {
    @IsString()
    couponCode: string;

    @IsNumber()
    @Transform(({ value }) => Number(value))
    cartAmount: number;

    @IsOptional()
    @IsString()
    customerProfileId?: string;
}
