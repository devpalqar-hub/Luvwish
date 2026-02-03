import { IsOptional, IsUUID, IsEnum, IsNumber, Min, IsString, IsBoolean } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export enum SupportedCurrency {
  USD = 'usd',
  INR = 'inr',
  EUR = 'eur',
  QAR = 'qar',
  KWD = 'KWD', // ✅ Kuwaiti Dinar
}



export class CreatePaymentIntentDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsBoolean()
  useCart?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsString()
  ShippingAddressId: string;

  // ✅ Optional + Default Qatar Riyal
  @IsOptional()
  @IsEnum(SupportedCurrency)
  currency?: SupportedCurrency = SupportedCurrency.KWD;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  couponName: string;

  @IsOptional()
  @IsString()
  fatoorahPaymentId?: string;

}
