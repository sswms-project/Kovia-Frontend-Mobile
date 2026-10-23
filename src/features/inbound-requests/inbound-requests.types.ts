import type { PillTone } from '@/components/ui/status-pill';

export type InboundRequestStatus =
  | 'Draft'
  | 'PendingApproval'
  | 'Approved'
  | 'Rejected'
  | 'Sent'
  | 'Confirmed'
  | 'PartiallyReceived'
  | 'Received'
  | 'Cancelled'
  | 'Closed';

export const INBOUND_STATUS_LABEL: Readonly<Record<string, string>> = {
  Draft: 'Bản nháp',
  PendingApproval: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Bị từ chối',
  Sent: 'Đã gửi nhà cung cấp',
  Confirmed: 'Nhà cung cấp xác nhận',
  PartiallyReceived: 'Nhận một phần',
  Received: 'Đã nhận đủ',
  Cancelled: 'Đã hủy',
  Closed: 'Đã đóng phần còn lại',
};

export const INBOUND_STATUS_TONE: Readonly<Record<string, PillTone>> = {
  Draft: 'neutral',
  PendingApproval: 'warning',
  Approved: 'primary',
  Rejected: 'danger',
  Sent: 'primary',
  Confirmed: 'primary',
  PartiallyReceived: 'warning',
  Received: 'success',
  Cancelled: 'danger',
  Closed: 'neutral',
};

export const SOURCE_TYPE_LABEL: Readonly<Record<string, string>> = {
  Supplier: 'Nhà cung cấp',
  InternalBranch: 'Chi nhánh nội bộ',
  InternalDepartment: 'Bộ phận nội bộ',
  ExternalPartner: 'Đối tác bên ngoài',
  Other: 'Nguồn khác',
};

export interface InboundRequestSummary {
  readonly id: string;
  readonly inboundRequestCode: string;
  readonly warehouseName?: string | null;
  readonly supplierName?: string | null;
  readonly sourceType: string;
  readonly sourceName?: string | null;
  readonly status: string;
  readonly createdByName: string;
  readonly expectedDate?: string | null;
  readonly createdAt: string;
  readonly lineCount: number;
  readonly orderedQuantity: number;
  readonly receivedQuantity: number;
}

export interface InboundRequestLine {
  readonly id: string;
  readonly productSKU: string;
  readonly productName: string;
  readonly unitName?: string | null;
  readonly enteredUnitName?: string | null;
  readonly enteredQuantity: number;
  readonly quantity: number;
  readonly receivedQuantity: number;
  readonly closedQuantity: number;
  readonly remainingQuantity: number;
}

export interface InboundRequestHistoryEvent {
  readonly action: string;
  readonly fromState?: string | null;
  readonly toState?: string | null;
  readonly actorName: string;
  readonly reason?: string | null;
  readonly createdAt: string;
}

export interface InboundRequestDetail {
  readonly id: string;
  readonly inboundRequestCode: string;
  readonly warehouseName?: string | null;
  readonly supplierName?: string | null;
  readonly sourceType: string;
  readonly sourceName?: string | null;
  readonly sourceReference?: string | null;
  readonly status: string;
  readonly createdByName: string;
  readonly approvedByName?: string | null;
  readonly expectedDate?: string | null;
  readonly createdAt: string;
  readonly submittedAt?: string | null;
  readonly approvedAt?: string | null;
  readonly rejectionReason?: string | null;
  readonly receivingAssignedToName?: string | null;
  readonly cancellationReason?: string | null;
  readonly closureReason?: string | null;
  readonly lines: readonly InboundRequestLine[];
  readonly history: readonly InboundRequestHistoryEvent[];
}
