import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { VariationOptionDto } from './variation-option.dto';

export class CreateProductVariationDto {
  @IsUUID()
  productId: string;

  @IsString()
  sku: string;

  @IsNumber()
  price: number;

  @IsNumber()
  stockCount: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariationOptionDto)
  options: VariationOptionDto[];
}
