import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/pagination/dto/pagination.dto';

export class SubCategoryFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
