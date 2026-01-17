import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateBannerDto {

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  link?: string;
}
