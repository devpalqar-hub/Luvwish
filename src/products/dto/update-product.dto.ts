// import { PartialType } from '@nestjs/mapped-types';
// import { CreateProductDto } from './create-product.dto';

// export class UpdateProductDto extends PartialType(CreateProductDto) { }

import { IsString, IsOptional, IsBoolean, IsNumber, ValidateNested, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
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
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === true || value === 'true')
    isStock?: boolean;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === true || value === 'true')
    isFeatured?: boolean;

    /** 🔹 Variations edit */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateProductVariationDto)
    variations?: UpdateProductVariationDto[];
}
