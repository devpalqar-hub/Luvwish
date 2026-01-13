import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/pagination/dto/pagination.dto';

export class CategoryFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
