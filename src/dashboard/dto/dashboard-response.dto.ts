export class CategoryOrderAnalytics {
  categoryId: string;
  categoryName: string;
  totalOrders: number;
  totalRevenue: number;
  productsSold: number;
}

export class DashboardResponseDto {
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalRevenue: number;
  categoryWiseAnalytics: CategoryOrderAnalytics[];
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
}
