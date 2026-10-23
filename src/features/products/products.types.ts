export interface Product {
  readonly id: string;
  readonly sku: string;
  readonly productName: string;
  readonly description?: string | null;
  readonly imageUrl?: string | null;
  readonly unitName?: string | null;
  readonly categoryName?: string | null;
  readonly categoryPath?: string | null;
  readonly status?: string;
  readonly barcodeValue?: string | null;
  readonly isLotTracked?: boolean;
  readonly shelfLifeDays?: number | null;
  readonly quantityOnHand?: number | null;
  readonly reservedQuantity?: number | null;
  readonly availableQuantity?: number | null;
}
export interface ProductList {
  readonly items: Product[];
  readonly totalCount: number;
}
export type StockStatus = 'LowStock' | 'OutOfStock';
export interface ProductFilters {
  readonly searchTerm?: string;
  readonly stockStatus?: StockStatus;
  readonly pageSize: number;
}
