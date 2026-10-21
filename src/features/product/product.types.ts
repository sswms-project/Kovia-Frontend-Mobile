export type ProductStatus = 'Active' | 'Inactive';
export type MasterDataStatus = 'Active' | 'Inactive';
export type ProductStockStatus = 'LowStock' | 'OutOfStock';

export interface ProductListQuery {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  categoryId?: string;
  warehouseId?: string;
  status?: ProductStatus;
  isLotTracked?: boolean;
  stockStatus?: ProductStockStatus;
}

export interface ProductResponse {
  id: string;
  sku: string;
  productName: string;
  description: string | null;
  imageUrl: string | null;
  unitId: string;
  unitName: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryCode: string | null;
  categoryPath: string | null;
  status: ProductStatus;
  barcodeValue: string | null;
  isLotTracked: boolean;
  shelfLifeDays: number | null;
  canChangeBaseUnit: boolean;
  canChangeTrackingMode: boolean;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  createdAt: string;
}

export interface ProductUnitConversion {
  id: string;
  productId: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  unitSymbol: string | null;
  quantityPrecision: number;
  conversionFactor: number;
  status: MasterDataStatus;
  createdAt: string;
  modifiedAt: string | null;
}

// The list omits the stock figures unless the caller may view inventory, hence the nulls.
export type ProductListItem = Omit<
  ProductResponse,
  | 'canChangeBaseUnit'
  | 'canChangeTrackingMode'
  | 'quantityOnHand'
  | 'reservedQuantity'
  | 'availableQuantity'
> & {
  unitConversions?: readonly ProductUnitConversion[];
  quantityOnHand: number | null;
  reservedQuantity: number | null;
  availableQuantity: number | null;
};

export interface ProductStockStatusCounts {
  all: number;
  lowStock: number;
  outOfStock: number;
}

export interface ProductListResponse {
  items: ProductListItem[];
  totalCount: number;
  stockStatusCounts: ProductStockStatusCounts | null;
}

export type ProductLotStatus = 'Active' | 'Expired' | 'Blocked';

export interface ProductLot {
  id: string;
  productId: string;
  lotNumber: string;
  supplierId: string | null;
  supplierName: string | null;
  manufacturedDate: string | null;
  expiryDate: string | null;
  status: ProductLotStatus;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
}

export interface ProductSupplier {
  id: string;
  productId: string;
  productSKU: string;
  productName: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  supplierStatus: 'Active' | 'Inactive';
  supplierProductCode: string | null;
  isPreferred: boolean;
  createdAt: string;
  modifiedAt: string | null;
}

export interface CategoryResponse {
  id: string;
  parentCategoryId: string | null;
  categoryCode: string;
  categoryName: string;
  description: string | null;
  status: ProductStatus;
  level: number;
  categoryPath: string;
  hasChildren: boolean;
  createdAt: string;
  modifiedAt: string | null;
}
