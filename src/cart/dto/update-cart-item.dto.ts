import {
  IsInt,
  Min,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class UpdateCartDto {
  @ValidateIf((o) => !o.productVariationId)
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ValidateIf((o) => !o.productId)
  @IsUUID()
  @IsOptional()
  productVariationId?: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
