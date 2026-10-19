import type { FilterOption } from '@/components/ui/filter-chips';
import type { PillTone } from '@/components/ui/status-pill';

import type { ProductLotStatus, ProductStatus, ProductStockStatus } from './product.types';

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  Active: 'Đang hoạt động',
  Inactive: 'Đã lưu trữ',
};

export const PRODUCT_STATUS_TONE: Record<ProductStatus, PillTone> = {
  Active: 'success',
  Inactive: 'neutral',
};

export const LOT_STATUS_LABEL: Record<ProductLotStatus, string> = {
  Active: 'Đang hoạt động',
  Expired: 'Hết hạn',
  Blocked: 'Đang khóa',
};

export const LOT_STATUS_TONE: Record<ProductLotStatus, PillTone> = {
  Active: 'success',
  Expired: 'danger',
  Blocked: 'warning',
};

export const STOCK_STATUS_FILTERS: readonly FilterOption<ProductStockStatus>[] = [
  { value: 'LowStock', label: 'Sắp hết hàng' },
  { value: 'OutOfStock', label: 'Hết hàng' },
];

export function formatTrackingMode(isLotTracked: boolean): string {
  return isLotTracked ? 'Theo lô' : 'Theo số lượng';
}
