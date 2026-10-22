import { ApiError, api, unwrap, type ApiResponse } from '@/lib/api';

import { auditLogPageSchema } from './audit-logs.schema';

export interface AuditLogParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly dateFrom?: string;
}

export const auditLogsApi = {
  list: async (params: AuditLogParams, scope: { tenantId: string; userId?: string }, signal?: AbortSignal) => {
    const data = auditLogPageSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/audit-logs', { params, signal })));
    if (data.pageNumber !== params.pageNumber || data.pageSize !== params.pageSize || data.items.some((item) =>
      item.tenantId?.toLowerCase() !== scope.tenantId.toLowerCase() || (scope.userId && item.userId.toLowerCase() !== scope.userId.toLowerCase())))
      throw new ApiError('Nhật ký không khớp phạm vi tài khoản đang đăng nhập.', 403);
    return data;
  },
};
