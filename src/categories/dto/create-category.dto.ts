import { IsString, IsOptional, Allow, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Allow()
  image?: any; // Handled separately as file upload

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}
