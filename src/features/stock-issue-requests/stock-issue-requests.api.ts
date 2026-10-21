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

export interface PickRequestBody {
  readonly items: readonly {
    readonly stockIssueRequestItemId: string;
    readonly inventoryStockId: string;
    readonly pickedQuantity: number;
    readonly scannedBarcode?: string;
    readonly scannedSlotCode?: string;
  }[];
}

export const stockIssueRequestsApi = {
  list: (params: StockIssueListParams) =>
    api.get<ApiResponse<PageResult<StockIssueRequest>>>('/stock-issue-requests', { params }).then(unwrap),
  get: (id: string) => api.get<ApiResponse<StockIssueRequest>>(`/stock-issue-requests/${id}`).then(unwrap),
  // Atomic for the whole batch and not idempotent: reload the request before retrying after a timeout.
  pick: (id: string, body: PickRequestBody) => api.post(`/stock-issue-requests/${id}/picks`, body),
  reportPickIssue: (id: string, body: { stockIssueRequestItemId?: string; reason: string }) =>
    api.post(`/stock-issue-requests/${id}/report-pick-issue`, body),
};
