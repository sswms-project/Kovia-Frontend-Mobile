export type WarehouseStatus = 'Active' | 'Inactive';

export const WAREHOUSE_STATUS_LABEL: Readonly<Record<string, string>> = {
  Active: 'Đang hoạt động',
  Inactive: 'Ngừng hoạt động',
};

export interface WarehouseSummary {
  readonly id: string;
  readonly warehouseCode: string;
  readonly warehouseName: string;
  readonly address?: string | null;
  readonly status: string;
  readonly createdAt: string;
  readonly managerName?: string | null;
}

export type LocationType = 'Zone' | 'Rack' | 'Slot';

export const LOCATION_TYPE_LABEL: Readonly<Record<string, string>> = {
  Zone: 'Khu vực',
  Rack: 'Kệ hàng',
  Slot: 'Ô lưu trữ',
};

export const OCCUPANCY_LABEL: Readonly<Record<string, string>> = {
  Vacant: 'Trống',
  Occupied: 'Có hàng',
  Reserved: 'Đã giữ chỗ',
  Full: 'Đầy',
};

export interface WarehouseLocation {
  readonly id: string;
  readonly type: string;
  readonly code: string;
  readonly name?: string | null;
  readonly lifecycleStatus: string;
  readonly occupancyStatus?: string | null;
  readonly zoneCode?: string | null;
  readonly rackCode?: string | null;
  readonly capacity?: number | null;
  readonly capacityUsed?: number | null;
  readonly capacityUnitSymbol?: string | null;
  readonly barcodeValue?: string | null;
  readonly isOutboundStaging: boolean;
}

export interface WarehouseDetail extends WarehouseSummary {
  readonly zoneCount: number;
  readonly modifiedAt?: string | null;
}
