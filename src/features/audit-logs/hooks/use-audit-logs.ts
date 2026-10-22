import { useInfiniteQuery } from '@tanstack/react-query';
import { P } from '@/config/permission-codes';
import { USER_ROLES } from '@/config/roles';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { ApiError } from '@/lib/api';

import { auditLogsApi } from '../audit-logs.api';
import type { AuditRange } from '../audit-logs.types';

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
  const access = useWarehouseAccess();
  const profile = access.profile.data;
  const allowed = access.validated && !!profile?.tenantId && profile.permissions.includes(P.AUDIT_LOGS_VIEW);
  const query = useInfiniteQuery({
    queryKey: ['audit-logs', access.selection.identity, access.selection.signature, access.selection.revision, range, search],
    enabled: allowed,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      if (!allowed || !profile?.tenantId) throw new ApiError('Bạn chưa có quyền xem nhật ký hoạt động.', 403);
      return auditLogsApi.list({ pageNumber: pageParam, pageSize: 20, search, dateFrom: rangeStart(range, new Date()) },
        { tenantId: profile.tenantId, userId: profile.role === USER_ROLES.WarehouseStaff ? profile.id : undefined }, signal);
    },
    getNextPageParam: (page) => page.pageNumber * page.pageSize < page.totalCount ? page.pageNumber + 1 : undefined,
    retry: false,
  });
  return { query, access, allowed };
}
