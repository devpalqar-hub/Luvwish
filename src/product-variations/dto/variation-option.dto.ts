import { IsString } from 'class-validator';

export class VariationOptionDto {
  @IsString()
  attributeName: string;

  @IsString()
  attributeValue: string;
}
