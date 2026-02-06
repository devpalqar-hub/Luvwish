import { IsString, IsNumber, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateProductVariationDto {
  @IsUUID()
  productId: string;

  @IsString()
  variationName: string;

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
}
