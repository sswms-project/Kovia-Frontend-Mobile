import type { PageResult } from '@/hooks/use-paged-query';
import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { AuditLogItem } from './audit-logs.types';

export interface AuditLogParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly dateFrom?: string;
}

// For warehouse staff the server forces the user filter, so this only ever lists their own actions.
export const auditLogsApi = {
  list: (params: AuditLogParams) =>
    api.get<ApiResponse<PageResult<AuditLogItem>>>('/audit-logs', { params }).then(unwrap),
};
