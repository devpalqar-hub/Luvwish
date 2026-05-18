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
import { CreateProductImageDto } from './create-product.dto';
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
    variationTitle?: string;

    @IsOptional()
    @IsString()
    sizeChart?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;

    /* product images (optional) */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateProductImageDto)
    images?: CreateProductImageDto[];

    /* variations (pure JSON array) */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateProductVariationDto)
    variations?: UpdateProductVariationDto[];
}
