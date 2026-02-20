import { IsUUID, IsInt, IsNumber, IsOptional } from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  productVariationId?: string;

  @IsInt()
  quantity: number;

  @IsNumber()
  discountedPrice: number;

  @IsNumber()
  actualPrice: number;
}
