import type { AxiosRequestConfig } from 'axios';

import { rejectReasonSchema } from '@/features/approvals/approvals.schema';
import type { PageResult } from '@/hooks/use-paged-query';
import { api, unwrap, type ApiResponse } from '@/lib/api';

import type {
  InboundAllowedActions,
  InboundDecisionBody,
  InboundRequestDetail,
  InboundRequestStatus,
  InboundRequestSummary,
} from './inbound-requests.types';

export interface InboundRequestListParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: InboundRequestStatus;
}

interface GuardedConfig extends AxiosRequestConfig { assertCurrentContext: () => void }

// Creating and editing requests stays with managers on the web; mobile reads and decides (approve/reject).
export const inboundRequestsApi = {
  list: (params: InboundRequestListParams) =>
    api.get<ApiResponse<PageResult<InboundRequestSummary>>>('/inbound-requests', { params }).then(unwrap),
  get: (id: string) => api.get<ApiResponse<InboundRequestDetail>>(`/inbound-requests/${id}`).then(unwrap),
  allowedActions: (id: string) =>
    api.get<ApiResponse<InboundAllowedActions>>(`/inbound-requests/${id}/allowed-actions`).then(unwrap),
  // expectedVersion is the base64 row version from allowed-actions; the BE answers 409 when it is stale.
  approve: (id: string, body: InboundDecisionBody, assertCurrentContext: () => void) => {
    const config: GuardedConfig = { assertCurrentContext };
    return api.post<ApiResponse<unknown>>(`/inbound-requests/${id}/approve`, body, config).then(unwrap);
  },
  reject: (id: string, body: InboundDecisionBody & { reason: string }, assertCurrentContext: () => void) => {
    const config: GuardedConfig = { assertCurrentContext };
    return api.post<ApiResponse<unknown>>(`/inbound-requests/${id}/reject`, { ...body, reason: rejectReasonSchema.parse(body.reason) }, config).then(unwrap);
  },
};
