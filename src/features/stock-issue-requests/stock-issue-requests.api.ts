import type { PageResult } from '@/hooks/use-paged-query';
import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { StockIssueRequest, StockIssueStatus } from './stock-issue-requests.types';

export interface StockIssueListParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: StockIssueStatus;
  readonly assignedToMe?: boolean;
}

// Read-only here: picking is handled by the stock-issue feature.
export const stockIssueRequestsApi = {
  list: (params: StockIssueListParams) =>
    api.get<ApiResponse<PageResult<StockIssueRequest>>>('/stock-issue-requests', { params }).then(unwrap),
  get: (id: string) => api.get<ApiResponse<StockIssueRequest>>(`/stock-issue-requests/${id}`).then(unwrap),
};
