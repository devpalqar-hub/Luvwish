import {
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    ValidateNested,
    IsArray,
    IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateProductVariationDto } from './update-product-variation.dto';

export class UpdateProductDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    subCategoryId?: string;

    @IsOptional()
    @IsNumber()
    discountedPrice?: number;

    @IsOptional()
    @IsNumber()
    actualPrice?: number;

    @IsOptional()
    @IsInt()
    stockCount?: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    variationTitle: string

    @IsOptional()
    @IsBoolean()
    isStock?: boolean;

    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;

    /* variations (pure JSON array) */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateProductVariationDto)
    variations?: UpdateProductVariationDto[];
}
