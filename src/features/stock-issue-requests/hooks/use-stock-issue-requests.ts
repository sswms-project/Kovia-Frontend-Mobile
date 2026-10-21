import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usePagedQuery } from '@/hooks/use-paged-query';

import { stockIssueRequestsApi, type PickRequestBody } from '../stock-issue-requests.api';
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

/** Refetches after every attempt, success or not, because a failed batch may still have changed stock. */
export function usePickStockIssueMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PickRequestBody) => stockIssueRequestsApi.pick(id, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: STOCK_ISSUE_QUERY_KEY }),
  });
}

export function useReportPickIssueMutation(id: string) {
  return useMutation({
    mutationFn: (body: { stockIssueRequestItemId?: string; reason: string }) =>
      stockIssueRequestsApi.reportPickIssue(id, body),
  });
}
