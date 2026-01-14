export class RecentOrderItemDto {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  itemsCount: number;
  createdAt: Date;
}

export class RecentOrdersResponseDto {
  data: RecentOrderItemDto[];
  total: number;
}
