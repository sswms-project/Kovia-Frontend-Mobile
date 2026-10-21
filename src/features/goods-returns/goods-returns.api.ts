import type { PageResult } from '@/hooks/use-paged-query';
import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { GoodsReturnRequest, GoodsReturnStatus } from './goods-returns.types';

export interface GoodsReturnListParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: GoodsReturnStatus;
}

// View only: approving and restocking returns needs a manager permission.
export const goodsReturnsApi = {
  list: (params: GoodsReturnListParams) =>
    api.get<ApiResponse<PageResult<GoodsReturnRequest>>>('/goods-return-requests', { params }).then(unwrap),
  get: (id: string) => api.get<ApiResponse<GoodsReturnRequest>>(`/goods-return-requests/${id}`).then(unwrap),
};
