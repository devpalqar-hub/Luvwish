import { IsString, IsNotEmpty, IsObject, IsOptional, IsArray } from 'class-validator';

export class WhatsAppWebhookDto {
  @IsString()
  @IsNotEmpty()
  object: string;

  @IsArray()
  @IsNotEmpty()
  entry: WhatsAppWebhookEntry[];
}

export class WhatsAppWebhookEntry {
  @IsString()
  id: string;

  @IsArray()
  changes: WhatsAppWebhookChange[];
}

export class WhatsAppWebhookChange {
  @IsObject()
  value: WhatsAppWebhookValue;

  @IsString()
  field: string;
}

export class WhatsAppWebhookValue {
  @IsString()
  @IsOptional()
  messaging_product?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;

  @IsArray()
  @IsOptional()
  contacts?: any[];

  @IsArray()
  @IsOptional()
  messages?: WhatsAppIncomingMessage[];

  @IsArray()
  @IsOptional()
  statuses?: any[];
}

export class WhatsAppIncomingMessage {
  @IsString()
  from: string;

  @IsString()
  id: string;

  @IsString()
  timestamp: string;

  @IsString()
  type: string;

  @IsObject()
  @IsOptional()
  text?: { body: string };

  @IsObject()
  @IsOptional()
  interactive?: any;

  @IsObject()
  @IsOptional()
  image?: any;

  @IsObject()
  @IsOptional()
  button?: any;
}
