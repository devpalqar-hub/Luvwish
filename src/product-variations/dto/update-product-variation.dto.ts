import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProductVariationDto } from './create-product-variation.dto';

export class UpdateProductVariationDto extends PartialType(
  OmitType(CreateProductVariationDto, ['productId'] as const)
) {}
