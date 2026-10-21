import type { PageResult } from '@/hooks/use-paged-query';
import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { InboundRequestDetail, InboundRequestStatus, InboundRequestSummary } from './inbound-requests.types';

export interface InboundRequestListParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: InboundRequestStatus;
}

// View only: creating, approving and editing requests stays with managers on the web.
export const inboundRequestsApi = {
  list: (params: InboundRequestListParams) =>
    api.get<ApiResponse<PageResult<InboundRequestSummary>>>('/inbound-requests', { params }).then(unwrap),
  get: (id: string) => api.get<ApiResponse<InboundRequestDetail>>(`/inbound-requests/${id}`).then(unwrap),
};
