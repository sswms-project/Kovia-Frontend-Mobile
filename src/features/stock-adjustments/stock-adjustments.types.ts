import type { PillTone } from '@/components/ui/status-pill';

export type StockAdjustmentStatus = 'Pending' | 'Approved' | 'Rejected';

export const ADJUSTMENT_STATUS_LABEL: Readonly<Record<string, string>> = {
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Đã từ chối',
};

export const ADJUSTMENT_STATUS_TONE: Readonly<Record<string, PillTone>> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
};

export const ADJUSTMENT_QUALITY_LABEL: Readonly<Record<string, string>> = {
  Good: 'Tốt',
  Damaged: 'Hỏng',
  Quarantine: 'Cách ly',
};

export interface StockAdjustmentLine {
  readonly id: string;
  readonly productName: string;
  readonly productSku: string;
  readonly slotCode?: string | null;
  readonly isSystemDefaultSlot: boolean;
  readonly rackCode?: string | null;
  readonly quantityChange: number;
  readonly systemQuantity?: number | null;
  readonly countedQuantity?: number | null;
  readonly unitName?: string | null;
  readonly lotNumber?: string | null;
  readonly qualityStatus: string;
  readonly status: string;
}

/** Multi-line adjustment voucher created from a completed cycle count; list items carry no lines. */
export interface StockAdjustmentVoucher {
  readonly id: string;
  readonly code: string;
  readonly cycleCountCode?: string | null;
  readonly warehouseName: string;
  readonly reason: string;
  readonly status: string;
  readonly createdAt: string;
  readonly createdByName: string;
  readonly approvedByName?: string | null;
  readonly approvedAt?: string | null;
  readonly rejectedByName?: string | null;
  readonly rejectedAt?: string | null;
  readonly rejectionReason?: string | null;
  readonly lineCount: number;
  readonly totalIncrease: number;
  readonly totalDecrease: number;
  readonly lines: readonly StockAdjustmentLine[];
}

export interface StockAdjustmentAllowedActions {
  readonly allowedActions: readonly string[];
  readonly selfApprovalRequired: boolean;
  readonly denialReasonCode?: string | null;
}
