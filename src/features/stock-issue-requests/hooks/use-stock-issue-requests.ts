import { useQuery } from '@tanstack/react-query';

import { usePagedQuery } from '@/hooks/use-paged-query';

import { stockIssueRequestsApi } from '../stock-issue-requests.api';
import type { StockIssueRequest, StockIssueStatus } from '../stock-issue-requests.types';

export const STOCK_ISSUE_QUERY_KEY = ['stock-issue-requests'] as const;

export interface StockIssueFilters {
  readonly searchTerm?: string;
  readonly status?: StockIssueStatus;
  readonly assignedToMe?: boolean;
}

export function useStockIssueRequestsQuery(filters: StockIssueFilters) {
  return usePagedQuery<StockIssueRequest>(
    [...STOCK_ISSUE_QUERY_KEY, 'list', filters],
    (pageNumber, pageSize) => stockIssueRequestsApi.list({ ...filters, pageNumber, pageSize }),
  );
}

export function useStockIssueRequestQuery(id: string) {
  return useQuery({
    queryKey: [...STOCK_ISSUE_QUERY_KEY, 'detail', id],
    queryFn: () => stockIssueRequestsApi.get(id),
  });
}

