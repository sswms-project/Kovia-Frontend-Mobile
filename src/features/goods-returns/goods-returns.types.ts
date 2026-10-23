import type { PillTone } from '@/components/ui/status-pill';

export type GoodsReturnStatus = 'Requested' | 'Approved' | 'Rejected' | 'Restocked';

export const RETURN_STATUS_LABEL: Readonly<Record<string, string>> = {
  Requested: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Bị từ chối',
  Restocked: 'Đã nhập lại kho',
};

export const RETURN_STATUS_TONE: Readonly<Record<string, PillTone>> = {
  Requested: 'warning',
  Approved: 'primary',
  Rejected: 'danger',
  Restocked: 'success',
};

export const RETURN_CONDITION_LABEL: Readonly<Record<string, string>> = {
  Good: 'Còn tốt',
  Damaged: 'Hư hỏng',
  Expired: 'Hết hạn',
  Scrap: 'Không nhập lại kho',
};

export interface GoodsReturnItem {
  readonly id: string;
  readonly stockIssuePickDetailId: string | null;
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly quantity: number;
  readonly condition: string;
  readonly lotNumber?: string | null;
  readonly lotId: string | null;
  readonly restockSlotId: string | null;
}

export interface GoodsReturnRequest {
  readonly id: string;
  readonly goodsReturnRequestCode: string;
  readonly stockIssueRequestId: string;
  readonly createdBy: string;
  readonly approvedBy: string | null;
  readonly stockIssueRequestCode: string;
  readonly reason: string;
  readonly status: string;
  readonly createdAt: string;
  readonly approvedAt?: string | null;
  readonly rejectionReason?: string | null;
  readonly items: readonly GoodsReturnItem[];
}
