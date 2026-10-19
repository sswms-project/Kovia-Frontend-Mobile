import type { FilterOption } from '@/components/ui/filter-chips';
import type { PillTone } from '@/components/ui/status-pill';

import {
  STOCK_MOVEMENT_TYPES,
  type InventoryEligibilityStatus,
  type QualityStatus,
  type StockMovementType,
} from './inventory.types';

const SYSTEM_DEFAULT_SLOT_CODE = '__SYSTEM_DEFAULT__';

interface LocationParts {
  readonly slotCode: string;
  readonly zoneCode?: string | null;
  readonly rackCode?: string | null;
  readonly isSystemDefaultSlot?: boolean;
}

/** "Khu vực A / Kệ B / SLOT-01"; stock parked on a rack without a slot has no slot part. */
export function formatInventoryLocation(location: LocationParts): string {
  const isRackLocation =
    location.isSystemDefaultSlot === true || location.slotCode === SYSTEM_DEFAULT_SLOT_CODE;

  return [
    location.zoneCode ? `Khu vực ${location.zoneCode}` : null,
    location.rackCode ? `Kệ ${location.rackCode}` : isRackLocation ? 'Kệ chưa xác định' : null,
    !isRackLocation ? location.slotCode || 'Vị trí chưa xác định' : null,
  ]
    .filter(Boolean)
    .join(' / ');
}

export function formatQuantity(value: number): string {
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
}

export function formatSignedQuantity(value: number): string {
  return value > 0 ? `+${formatQuantity(value)}` : formatQuantity(value);
}

export const QUALITY_STATUS_LABEL: Record<QualityStatus, string> = {
  Good: 'Tốt',
  Damaged: 'Hư hỏng',
  Quarantine: 'Cách ly',
};

export const QUALITY_STATUS_TONE: Record<QualityStatus, PillTone> = {
  Good: 'success',
  Damaged: 'danger',
  Quarantine: 'warning',
};

export const ELIGIBILITY_STATUS_LABEL: Record<InventoryEligibilityStatus, string> = {
  Available: 'Khả dụng',
  InspectionHold: 'Chờ kiểm tra',
  DamageHold: 'Giữ do hư hỏng',
  Quarantine: 'Cách ly',
};

export const ELIGIBILITY_STATUS_TONE: Record<InventoryEligibilityStatus, PillTone> = {
  Available: 'success',
  InspectionHold: 'warning',
  DamageHold: 'danger',
  Quarantine: 'warning',
};

export const MOVEMENT_TYPE_LABEL: Record<StockMovementType, string> = {
  [STOCK_MOVEMENT_TYPES.inbound]: 'Nhập kho',
  [STOCK_MOVEMENT_TYPES.putAway]: 'Cất hàng',
  [STOCK_MOVEMENT_TYPES.pick]: 'Lấy hàng',
  [STOCK_MOVEMENT_TYPES.issue]: 'Xuất kho',
  [STOCK_MOVEMENT_TYPES.transferOut]: 'Điều chuyển đi',
  [STOCK_MOVEMENT_TYPES.transferIn]: 'Điều chuyển đến',
  [STOCK_MOVEMENT_TYPES.adjustment]: 'Điều chỉnh',
  [STOCK_MOVEMENT_TYPES.returnIn]: 'Nhập hàng trả lại',
  [STOCK_MOVEMENT_TYPES.scrap]: 'Loại bỏ',
  [STOCK_MOVEMENT_TYPES.opening]: 'Tồn đầu kỳ',
  [STOCK_MOVEMENT_TYPES.reclassification]: 'Phân loại lại',
  [STOCK_MOVEMENT_TYPES.correction]: 'Sửa sai biến động',
};

export const MOVEMENT_TYPE_FILTERS: readonly FilterOption<StockMovementType>[] = (
  Object.values(STOCK_MOVEMENT_TYPES) as StockMovementType[]
).map((value) => ({ value, label: MOVEMENT_TYPE_LABEL[value] }));

export function formatMovementType(value: string): string {
  return MOVEMENT_TYPE_LABEL[value as StockMovementType] ?? (value || 'Không xác định');
}

const REFERENCE_LABEL: Record<string, string> = {
  GoodsReceiptItem: 'Phiếu nhận hàng',
  GoodsReceipt: 'Phiếu nhận hàng',
  StockTransfer: 'Phiếu điều chuyển',
  StockTransferItem: 'Phiếu điều chuyển',
  StockIssuePickDetail: 'Phiếu xuất kho',
  StockIssueRequest: 'Yêu cầu xuất kho',
  StockIssueRequestItem: 'Yêu cầu xuất kho',
  StockAdjustment: 'Phiếu điều chỉnh tồn',
  CycleCount: 'Phiếu kiểm kê',
  OpeningStockRecord: 'Phiếu tồn đầu kỳ',
  DamageCase: 'Phiếu hàng hỏng',
  GoodsReturnRequestItem: 'Phiếu trả hàng',
  GoodsReturnRequest: 'Phiếu trả hàng',
  PutAwayCorrection: 'Phiếu sửa vị trí cất hàng',
  WarehouseTaskExecution: 'Công việc kho',
};

export function formatMovementReference(referenceType: string): string {
  return REFERENCE_LABEL[referenceType] ?? (referenceType ? 'Chứng từ khác' : 'Không có nguồn');
}
