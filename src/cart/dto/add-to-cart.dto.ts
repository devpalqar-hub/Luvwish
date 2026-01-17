import {
  IsUUID,
  IsInt,
  Min,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class AddToCartDto {
  @ValidateIf((o) => !o.productVariationId)
  @IsUUID()
  productId?: string;

  @ValidateIf((o) => !o.productId)
  @IsUUID()
  productVariationId?: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
