// import { PartialType } from '@nestjs/mapped-types';
// import { CreateProductDto } from './create-product.dto';

// export class UpdateProductDto extends PartialType(CreateProductDto) { }

import { IsString, IsOptional, IsBoolean, IsNumber, ValidateNested, IsArray, IsInt } from 'class-validator';
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
    @IsString()
    @Transform(({ value }) => {
        if (typeof value === 'number') return value;
        return Number(value);
    })
    stockCount?: string;


    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => {
        if (typeof value === 'boolean') return value;
        return value === 'true';
    })
    isStock?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => {
        if (typeof value === 'boolean') return value;
        return value === 'true';
    })
    isFeatured?: string;


    /** 🔹 Variations edit */
    @IsOptional()
    @IsArray()
    @Transform(({ value }) =>
        typeof value === 'string' ? JSON.parse(value) : value,
    )
    @ValidateNested({ each: true })
    @Type(() => UpdateProductVariationDto)
    variations?: UpdateProductVariationDto[];

    /** image metadata (files come separately) */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => NewProductImageDto)
    newImages?: NewProductImageDto[];
}
