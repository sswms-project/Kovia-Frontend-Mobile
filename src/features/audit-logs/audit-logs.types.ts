import type { z } from 'zod';
import type { auditLogSchema, auditLogChangeSchema } from './audit-logs.schema';

export type AuditLogChange = z.infer<typeof auditLogChangeSchema>;
export type AuditLogItem = z.infer<typeof auditLogSchema>;

export type AuditRange = 'today' | 'week' | 'month';

export const AUDIT_RANGE_LABEL: Readonly<Record<AuditRange, string>> = {
  today: 'Hôm nay',
  week: '7 ngày qua',
  month: '30 ngày qua',
};
