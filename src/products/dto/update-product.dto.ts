import {
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    ValidateNested,
    IsArray,
    IsInt,
    IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateProductVariationDto } from './update-product-variation.dto';


export class UpdateProductMetaDto {
    @IsString()
    id: string;

    @IsOptional()
    @IsEnum(['SPEC', 'INFO'])
    type?: 'SPEC' | 'INFO';

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    value?: string;
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

    /* product metas */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateProductMetaDto)
    productMetas?: UpdateProductMetaDto[];
}
