export class AdminCustomerItemDto {
  id: string;
  customerName: string | null;
  email: string;
  phoneNumber: string | null;
  numberOfOrders: number;
  totalAmountSpent: number;
  joinedDate: Date;
  status: 'active' | 'inactive';
}

export class AdminCustomerListResponseDto {
  data: AdminCustomerItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
