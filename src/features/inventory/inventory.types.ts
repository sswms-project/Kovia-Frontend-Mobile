export type QualityStatus = 'Good' | 'Damaged' | 'Quarantine';

export type InventoryEligibilityStatus = 'Available' | 'InspectionHold' | 'DamageHold' | 'Quarantine';

export interface InventoryListQuery {
  pageNumber: number;
  pageSize: number;
  warehouseId?: string;
  zoneId?: string;
  rackId?: string;
  slotId?: string;
  productId?: string;
  searchTerm?: string;
  categoryId?: string;
  includeLastCount?: boolean;
  inStockOnly?: boolean;
}

export interface InventoryStock {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  slotId: string;
  slotCode: string;
  lotId: string | null;
  lotNumber: string | null;
  manufacturedDate: string | null;
  expiryDate: string | null;
  lotStatus: string | null;
  unitName?: string | null;
  qualityStatus: QualityStatus;
  eligibilityStatus: InventoryEligibilityStatus;
  quantityOnHand: number;
  reservedQuantity: number;
  holdQuantity: number;
  availableQuantity: number;
  version: string | null;
  updatedAt: string | null;
  canManageWarehouse: boolean;
  rackId?: string | null;
  rackCode?: string | null;
  zoneCode?: string | null;
  isSystemDefaultSlot?: boolean;
}

export interface InventoryStockListResponse {
  items: InventoryStock[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  snapshotAt: string;
}

export interface InventoryWarehouseOption {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  canManageWarehouse: boolean;
}

export const STOCK_MOVEMENT_TYPES = {
  inbound: 'Inbound',
  putAway: 'PutAway',
  pick: 'Pick',
  issue: 'Issue',
  transferOut: 'TransferOut',
  transferIn: 'TransferIn',
  adjustment: 'Adjustment',
  returnIn: 'ReturnIn',
  scrap: 'Scrap',
  opening: 'Opening',
  reclassification: 'Reclassification',
  correction: 'Correction',
} as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[keyof typeof STOCK_MOVEMENT_TYPES];

export interface StockMovementListQuery {
  pageNumber: number;
  pageSize: number;
  productId?: string;
  warehouseId?: string;
  slotId?: string;
  searchTerm?: string;
  movementType?: StockMovementType;
  dateFrom?: string;
  dateTo?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  slotId: string;
  slotCode: string;
  lotId: string | null;
  lotNumber: string | null;
  qualityStatus: QualityStatus;
  eligibilityStatus: InventoryEligibilityStatus;
  quantityChange: number;
  balanceAfter: number;
  movementType: StockMovementType;
  referenceType: string;
  referenceId: string;
  correctsMovementId: string | null;
  correctionReason: string | null;
  performedByUserId: string;
  performedByName: string;
  occurredAt: string;
  createdAt: string;
  warehouseName?: string | null;
  zoneCode?: string | null;
  rackCode?: string | null;
  isSystemDefaultSlot?: boolean;
  unitName?: string | null;
  referenceCode?: string | null;
}

export interface StockMovementListResponse {
  items: StockMovement[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
