// apply-coupon.dto.ts
import { IsUUID, IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ApplyCouponDto {
    @IsUUID()
    couponName: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Transform(({ value }) => Number(value))
    orderAmount?: number;
}
