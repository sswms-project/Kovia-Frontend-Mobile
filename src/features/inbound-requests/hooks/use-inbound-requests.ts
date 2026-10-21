import { useQuery } from '@tanstack/react-query';

import { usePagedQuery } from '@/hooks/use-paged-query';

import { inboundRequestsApi } from '../inbound-requests.api';
import type { InboundRequestStatus, InboundRequestSummary } from '../inbound-requests.types';

export const INBOUND_REQUESTS_QUERY_KEY = ['inbound-requests'] as const;

export interface InboundRequestFilters {
  readonly searchTerm?: string;
  readonly status?: InboundRequestStatus;
}

export function useInboundRequestsQuery(filters: InboundRequestFilters) {
  return usePagedQuery<InboundRequestSummary>(
    [...INBOUND_REQUESTS_QUERY_KEY, 'list', filters],
    (pageNumber, pageSize) => inboundRequestsApi.list({ ...filters, pageNumber, pageSize }),
  );
}

export function useInboundRequestQuery(id: string) {
  return useQuery({
    queryKey: [...INBOUND_REQUESTS_QUERY_KEY, 'detail', id],
    queryFn: () => inboundRequestsApi.get(id),
  });
}
