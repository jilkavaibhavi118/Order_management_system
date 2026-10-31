export interface Order {
  id: string;
  customerId: string;
  warehouseId: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderPage {
  orders: Order[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface OrderQuery {
  page: number;
  pageSize: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface OrderRequest {
  customerId: string;
  warehouseId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface OrderStatusRequest {
  status: string;
}

export interface CategoryOption {
  label: string;
  value: string;
}

