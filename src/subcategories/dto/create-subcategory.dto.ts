import { IsString, IsOptional, IsUUID, Allow } from 'class-validator';

export class CreateSubCategoryDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Allow()
  image?: any; // Handled separately as file upload
}
