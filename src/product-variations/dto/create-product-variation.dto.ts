import { IsArray, IsString, IsNumber, IsBoolean, IsOptional, IsUUID, IsEnum, IsObject } from 'class-validator';
import { VariationType } from '@prisma/client';

export class CreateProductVariationDto {
  @IsUUID()
  productId: string;

  @IsString()
  variationName: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  sku?: string;

  @IsNumber()
  discountedPrice: number;

  @IsNumber()
  actualPrice: number;

  @IsNumber()
  stockCount: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsEnum(VariationType)
  variationType?: VariationType;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}
