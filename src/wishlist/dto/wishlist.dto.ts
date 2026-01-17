import {
  IsUUID,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class CreateWishlistDto {
  @ValidateIf((o) => !o.productVariationId)
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ValidateIf((o) => !o.productId)
  @IsUUID()
  @IsOptional()
  productVariationId?: string;
}
