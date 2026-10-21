export interface AuditLogChange {
  readonly label: string;
  readonly before?: string | null;
  readonly after?: string | null;
}

export interface AuditLogItem {
  readonly id: string;
  readonly warehouseName?: string | null;
  readonly actorName: string;
  readonly actionLabel: string;
  readonly entityTypeLabel: string;
  readonly referenceDisplay?: string | null;
  readonly summary: string;
  readonly description?: string | null;
  readonly reason?: string | null;
  readonly changes: readonly AuditLogChange[];
  readonly createdAt: string;
}

export type AuditRange = 'today' | 'week' | 'month';

export const AUDIT_RANGE_LABEL: Readonly<Record<AuditRange, string>> = {
  today: 'Hôm nay',
  week: '7 ngày qua',
  month: '30 ngày qua',
};
