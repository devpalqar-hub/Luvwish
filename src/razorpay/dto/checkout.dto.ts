import { IsOptional, IsUUID, IsEnum, IsNumber, Min, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export enum SupportedCurrency {
  USD = 'usd',
  INR = 'inr',
  EUR = 'eur',
}

export class CreatePaymentIntentDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  cartId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsString()
  ShippingAddressId: string;

  @IsEnum(SupportedCurrency)
  currency: SupportedCurrency;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
