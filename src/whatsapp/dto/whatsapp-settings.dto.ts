import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateWhatsAppSettingsDto {
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @IsString()
  @IsNotEmpty()
  businessId: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  webhookToken: string;

  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateWhatsAppSettingsDto {
  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  phoneNumberId?: string;

  @IsString()
  @IsOptional()
  businessId?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsString()
  @IsOptional()
  webhookToken?: string;

  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
