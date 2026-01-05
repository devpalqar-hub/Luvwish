import { IsString, IsOptional, IsUUID } from 'class-validator';

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
}
