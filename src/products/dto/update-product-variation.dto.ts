import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateProductVariationDto {
    /** Required to identify variation */
    @IsString()
    id: string;

    /** Optional but validated if present */
    @IsOptional()
    @IsString()
    productId?: string; // will be validated but NOT updated

    @IsOptional()
    @IsString()
    variationName?: string;

    @IsOptional()
    @IsString()
    sku?: string;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => Number(value))
    discountedPrice?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => Number(value))
    actualPrice?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => Number(value))
    stockCount?: number;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === true || value === 'true')
    isAvailable?: boolean;

    /** ✅ Explicitly allowed but NEVER used */
    @IsOptional()
    @IsDateString()
    createdAt?: string;

    @IsOptional()
    @IsDateString()
    updatedAt?: string;

}
