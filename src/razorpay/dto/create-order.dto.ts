import { IsString, IsNumber, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
    @IsUUID()
    productId: string;

    @IsNumber()
    quantity: number;

    @IsNumber()
    discountedPrice: number;

    @IsNumber()
    actualPrice: number;
}

export class CreateOrderDto {
    @IsUUID()
    customerProfileId: string;

    @IsUUID()
    shippingAddressId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @IsNumber()
    totalAmount: number;

    @IsNumber()
    shippingCost: number;

    @IsNumber()
    taxAmount: number;

    @IsNumber()
    discountAmount: number;

    @IsString()
    notes?: string;
}
