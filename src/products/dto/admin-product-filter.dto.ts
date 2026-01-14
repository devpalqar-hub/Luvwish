import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum StockStatus {
  IN_STOCK = 'in_stock',
  OUT_OF_STOCK = 'out_of_stock',
  LOW_STOCK = 'low_stock',
}

export class AdminProductFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @IsOptional()
  @IsEnum(StockStatus)
  stockStatus?: StockStatus;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
