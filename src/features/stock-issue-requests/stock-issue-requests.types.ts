import type { PillTone } from '@/components/ui/status-pill';

export type StockIssueStatus =
  | 'Pending'
  | 'ReleasedForPicking'
  | 'Picking'
  | 'Picked'
  | 'AuthorizedForDispatch'
  | 'Dispatched'
  | 'Cancelled';

export const STOCK_ISSUE_STATUS_LABEL: Readonly<Record<string, string>> = {
  Pending: 'Chờ xử lý',
  ReleasedForPicking: 'Đã giao việc, chờ lấy hàng',
  Picking: 'Đang lấy hàng',
  Picked: 'Sẵn sàng xuất (chờ lệnh)',
  AuthorizedForDispatch: 'Đã cho phép xuất',
  Dispatched: 'Đã xuất kho',
  Cancelled: 'Đã hủy',
};

export const STOCK_ISSUE_STATUS_TONE: Readonly<Record<string, PillTone>> = {
  Pending: 'neutral',
  ReleasedForPicking: 'warning',
  Picking: 'primary',
  Picked: 'success',
  AuthorizedForDispatch: 'success',
  Dispatched: 'success',
  Cancelled: 'danger',
};

export interface PickLocation {
  readonly inventoryStockId: string;
  readonly slotId: string;
  readonly slotCode: string;
  readonly zoneCode?: string | null;
  readonly rackCode?: string | null;
  readonly lotId?: string | null;
  readonly lotNumber?: string | null;
  readonly expiryDate?: string | null;
  readonly reservedQuantity: number;
}

export interface PickDetail {
  readonly id: string;
  readonly slotCode: string;
  readonly lotNumber?: string | null;
  readonly pickedQuantity: number;
  readonly pickedByName?: string | null;
  readonly pickedAt?: string | null;
}

export interface StockIssueItem {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly barcode?: string | null;
  readonly quantity: number;
  readonly pickedQuantity: number;
  readonly note?: string | null;
  readonly enteredQuantity: number;
  readonly enteredUnitName?: string | null;
  readonly conversionFactor: number;
  readonly pickLocations: readonly PickLocation[];
  readonly pickDetails: readonly PickDetail[];
}

export interface StockIssueRequest {
  readonly id: string;
  readonly stockIssueRequestCode: string;
  readonly stockRecipientName: string;
  readonly recipientCode?: string | null;
  readonly warehouseId: string;
  readonly warehouseName: string;
  readonly purpose?: string | null;
  readonly referenceCode?: string | null;
  readonly issueDate?: string | null;
  readonly note?: string | null;
  readonly recipientName: string;
  readonly recipientPhone: string;
  readonly recipientAddress: string;
  readonly status: string;
  readonly createdAt: string;
  readonly dispatchedAt?: string | null;
  readonly assignedStaffId?: string | null;
  readonly assignedStaffName?: string | null;
  readonly version?: string | null;
  readonly items: readonly StockIssueItem[];
}
