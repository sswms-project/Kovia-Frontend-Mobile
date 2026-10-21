import { usePagedQuery } from '@/hooks/use-paged-query';

import { auditLogsApi } from '../audit-logs.api';
import type { AuditLogItem, AuditRange } from '../audit-logs.types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the range as an ISO instant; "today" starts at local midnight. */
function rangeStart(range: AuditRange, now: Date): string {
  if (range === 'today') {
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    return midnight.toISOString();
  }
  return new Date(now.getTime() - (range === 'week' ? 7 : 30) * DAY_MS).toISOString();
}

export function useAuditLogsQuery(range: AuditRange, search: string | undefined) {
  return usePagedQuery<AuditLogItem>(['audit-logs', range, search], (pageNumber, pageSize) =>
    auditLogsApi.list({ pageNumber, pageSize, search, dateFrom: rangeStart(range, new Date()) }),
  );
}
