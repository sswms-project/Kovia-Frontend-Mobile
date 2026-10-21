export type DamageCaseStatus = 'Open' | 'Resolved';

export const DAMAGE_STATUS_LABEL: Readonly<Record<string, string>> = {
  Open: 'Đang giữ',
  Resolved: 'Đã xử lý',
};

export const DISPOSITION_LABEL: Readonly<Record<string, string>> = {
  ReturnToAvailable: 'Trả lại khả dụng',
  ContinueHold: 'Tiếp tục giữ',
  SupplierReturn: 'Trả nhà cung cấp',
  InventoryAdjustment: 'Điều chỉnh giảm tồn',
  RequestEvidence: 'Yêu cầu bổ sung bằng chứng',
};

export const DAMAGE_ACTION_LABEL: Readonly<Record<string, string>> = {
  ReportDamaged: 'Báo hàng hỏng',
  ReportDamagedFromCycleCount: 'Tạo từ phiếu kiểm kê',
  DecideDisposition: 'Quyết định xử lý',
  RequestEvidence: 'Yêu cầu bổ sung bằng chứng',
  AddEvidence: 'Bổ sung bằng chứng',
};

export interface DamageEvidence {
  readonly id: string;
  readonly fileName: string;
}

export interface DamageHistoryEntry {
  readonly action: string;
  readonly actorName: string;
  readonly reason?: string | null;
  readonly createdAt: string;
}

export interface DamageCase {
  readonly id: string;
  readonly sku: string;
  readonly productName: string;
  readonly warehouseName: string;
  readonly slotCode: string;
  readonly rackCode?: string | null;
  readonly isSystemDefaultSlot: boolean;
  readonly lotNumber?: string | null;
  readonly unitName?: string | null;
  readonly quantity: number;
  readonly isQuantityConfirmed: boolean;
  readonly resolvedQuantity: number;
  readonly remainingQuantity: number;
  readonly reason: string;
  readonly evidence: readonly DamageEvidence[];
  readonly status: string;
  readonly disposition?: string | null;
  readonly reportedByUserId: string;
  readonly reportedByName: string;
  readonly createdAt: string;
  readonly relatedTaskType?: string | null;
  readonly relatedTaskCode?: string | null;
  readonly history: readonly DamageHistoryEntry[];
}
