import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductImageDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateProductVariationDto {
  @IsString()
  variationName: string;

  @IsString()
  sku: string;

  @IsNumber()
  price: number;

  @IsNumber()
  stockCount: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  subCategoryId: string;

  @IsString()
  discountedPrice: number;

  @IsString()
  actualPrice: number;

  @IsString()
  stockCount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isStock?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariationDto)
  variations?: CreateProductVariationDto[];
}
