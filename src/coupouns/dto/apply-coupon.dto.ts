// apply-coupon.dto.ts
import { IsUUID, IsNumber, IsOptional, Min, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class ApplyCouponDto {
    @IsString()
    @Matches(/^[A-Z]+$/, { message: 'couponName must contain only capital letters' })
    couponName: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Transform(({ value }) => Number(value))
    orderAmount?: number;
}
