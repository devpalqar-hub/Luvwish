export class TopProductItemDto {
  id: string;
  productName: string;
  categoryName: string | null;
  subCategoryName: string | null;
  totalSold: number;
  totalRevenue: number;
  stockCount: number;
  discountedPrice: number;
  actualPrice: number;
  image: string | null;
}

export class TopProductsResponseDto {
  data: TopProductItemDto[];
  count: number;
}
