import type { PillTone } from '@/components/ui/status-pill';

import type { CycleCount, CycleCountItem } from './cycle-count.schema';

export const MAX_DAMAGE_PHOTOS = 3;

export const STATUS_LABEL: Readonly<Record<string, string>> = {
  Scheduled: 'Đã lên lịch',
  Counting: 'Đang kiểm kê',
  Submitted: 'Đã gửi kết quả',
  Recount: 'Cần đếm lại',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã hủy',
};

export const STATUS_TONE: Readonly<Record<string, PillTone>> = {
  Scheduled: 'neutral',
  Counting: 'primary',
  Submitted: 'success',
  Recount: 'warning',
  Completed: 'success',
  Cancelled: 'danger',
};

export const QUALITY_LABEL: Readonly<Record<string, string>> = {
  Good: 'Tốt',
  Damaged: 'Hỏng',
  Quarantine: 'Cách ly',
};

export type ItemState = 'counted' | 'recount' | 'pending';

/** Counted wins; otherwise an item the manager sent back this round needs a recount. */
export function getItemState(item: CycleCountItem, count: CycleCount): ItemState {
  if (item.countedQuantity != null) return 'counted';
  if (count.status === 'Recount' && item.requestedRecountRound === count.recountRound) return 'recount';
  return 'pending';
}

export const ITEM_STATE_LABEL: Readonly<Record<ItemState, string>> = {
  counted: 'Đã kiểm kê',
  recount: 'Cần đếm lại',
  pending: 'Chưa kiểm kê',
};

export const ITEM_STATE_TONE: Readonly<Record<ItemState, PillTone>> = {
  counted: 'success',
  recount: 'warning',
  pending: 'neutral',
};

/** In a recount only the lines the manager selected can be edited. */
export function isItemEditable(item: CycleCountItem, count: CycleCount, canRecord: boolean): boolean {
  if (!canRecord) return false;
  if (count.status === 'Counting') return true;
  return count.status === 'Recount' && item.requestedRecountRound === count.recountRound;
}

export function formatItemLocation(item: CycleCountItem): string {
  if (item.isSystemDefaultSlot && item.rackCode) return item.rackCode;
  return item.slotCode;
}

export function matchesProductCode(item: CycleCountItem, code: string): boolean {
  const normalized = code.trim().toLowerCase();
  return (
    item.productSku.toLowerCase() === normalized || item.productBarcode?.toLowerCase() === normalized
  );
}

export function matchesSlotCode(item: CycleCountItem, code: string): boolean {
  const normalized = code.trim().toLowerCase();
  return (
    item.slotCode.toLowerCase() === normalized ||
    item.slotBarcode?.toLowerCase() === normalized ||
    (item.isSystemDefaultSlot && item.rackCode?.toLowerCase() === normalized)
  );
}

export function matchesSearch(item: CycleCountItem, term: string): boolean {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return true;
  return [item.productName, item.productSku, item.productBarcode, item.slotCode, item.rackCode, item.lotNumber]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(normalized));
}

export function formatQuantity(value: number): string {
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}
