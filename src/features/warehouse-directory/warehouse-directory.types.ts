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

export interface WarehouseDetail extends WarehouseSummary {
  readonly zoneCount: number;
  readonly modifiedAt?: string | null;
}
