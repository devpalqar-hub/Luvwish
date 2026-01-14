export class AdminProductItemDto {
  id: string;
  productName: string;
  firstImage: string | null;
  images: string[];
  subCategory: string | null;
  stockPrice: number;
  discountedPrice: number;
  sku: string | null;
  isVariationProduct: boolean;
  variationId: string | null;
  stockStatus: 'in_stock' | 'out_of_stock' | 'low_stock';
  stockCount: number;
}

export class AdminProductListResponseDto {
  data: AdminProductItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
