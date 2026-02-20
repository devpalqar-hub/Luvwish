// check-coupon.dto.ts
import { IsNumber, IsOptional, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CheckCouponDto {
    @IsString()
    @Matches(/^[A-Z]+$/, { message: 'couponName must contain only capital letters' })
    couponName: string;

    @IsNumber()
    @Transform(({ value }) => Number(value))
    cartAmount: number;

    @IsOptional()
    @IsString()
    customerProfileId?: string;
}
