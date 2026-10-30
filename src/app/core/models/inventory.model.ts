export interface InventoryAdjustmentRequest {
  productId: string;
  warehouseId: string;
  quantity: number;
  reason?: string;
}

export interface InventoryRecord {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  quantityOnHand?: number;
  availableQuantity?: number;
  stockQuantity?: number;
  lastUpdatedAt?: string;
}

export interface InventoryTransactionQuery {
  page?: number;
  pageSize?: number;
  productId?: string;
  warehouseId?: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
}

export interface InventoryTransactionPage {
  items: InventoryTransaction[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  type: string;
  createdAt: string;
}

export interface LowStockRecord {
  productId: string;
  productName: string;
  warehouseId: string;
  quantity: number;
  minStock: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  costPrice?: number;
  sellPrice?: number;
  minStock?: number;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface ProductRequest {
  sku: string;
  name: string;
  category: string;
  supplierId?: string;
  costPrice?: number;
  sellPrice?: number;
  minStock?: number;
  description?: string;
  imageUrl?: string;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface SupplierRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
}

export interface WarehouseMutationResponse {
  id: string;
  message?: string;
}

export interface WarehouseRequest {
  name: string;
  location?: string;
}
