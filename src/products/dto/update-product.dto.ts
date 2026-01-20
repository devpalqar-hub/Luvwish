import {
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    ValidateNested,
    IsArray,
    IsInt,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UpdateProductVariationDto } from './update-product-variation.dto';

class NewProductImageDto {
    @IsOptional()
    @IsString()
    altText?: string;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === true || value === 'true')
    isMain?: boolean;
}

export class UpdateProductDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    subCategoryId?: string;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => Number(value))
    discountedPrice?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => Number(value))
    actualPrice?: number;

    @IsOptional()
    @IsInt()
    @Transform(({ value }) => Number(value))
    stockCount?: number;

    @IsOptional()
    @IsString()
    description?: string;


    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === true || value === 'true') return true;
        if (value === false || value === 'false') return false;
        return undefined;
    })
    isStock?: boolean;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === true || value === 'true') return true;
        if (value === false || value === 'false') return false;
        return undefined;
    })
    isFeatured?: boolean;




    /* variations */
    @IsOptional()
    @IsArray()
    @Transform(({ value }) =>
        typeof value === 'string' ? JSON.parse(value) : value,
    )
    @ValidateNested({ each: true })
    @Type(() => UpdateProductVariationDto)
    variations?: UpdateProductVariationDto[];

    /* images metadata */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => NewProductImageDto)
    newImages?: NewProductImageDto[];
}
