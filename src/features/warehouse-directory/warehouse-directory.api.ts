import type { PageResult } from '@/hooks/use-paged-query';
import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { WarehouseDetail, WarehouseStatus, WarehouseSummary } from './warehouse-directory.types';

interface WarehouseQueryResult {
  readonly items: readonly WarehouseSummary[];
  readonly totalCount: number;
}

export interface WarehouseListParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchText?: string;
  readonly status?: WarehouseStatus;
}

export const warehouseDirectoryApi = {
  // This endpoint pages with top/skip; it is mapped to pageNumber/pageSize so lists share one hook.
  list: async ({ pageNumber, pageSize, searchText, status }: WarehouseListParams): Promise<PageResult<WarehouseSummary>> => {
    const result = await api
      .get<ApiResponse<WarehouseQueryResult>>('/warehouses', {
        // totalCount is only reliable when needTotalCount is sent.
        params: { top: pageSize, skip: (pageNumber - 1) * pageSize, needTotalCount: true, searchText, status },
      })
      .then(unwrap);
    return { items: result.items, totalCount: result.totalCount, pageNumber, pageSize };
  },
  get: (id: string) => api.get<ApiResponse<WarehouseDetail>>(`/warehouses/${id}`).then(unwrap),
};
