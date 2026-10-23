import type { PageResult } from '@/hooks/use-paged-query';
import { api, unwrap, type ApiResponse } from '@/lib/api';

import type {
  LocationType,
  WarehouseDetail,
  WarehouseLocation,
  WarehouseStatus,
  WarehouseSummary,
} from './warehouse-directory.types';

export interface LocationListParams {
  readonly warehouseId: string;
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchText?: string;
  readonly type?: LocationType;
}

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
  // Zones, racks and slots in one list, filtered by type. The barcode value comes with each row,
  // so the app draws it locally instead of calling the barcode endpoint (which needs a manager permission).
  locations: async ({
    warehouseId,
    pageNumber,
    pageSize,
    searchText,
    type,
  }: LocationListParams): Promise<PageResult<WarehouseLocation>> => {
    const result = await api
      .get<ApiResponse<{ items: readonly WarehouseLocation[]; totalCount: number }>>(
        `/warehouses/${warehouseId}/locations`,
        { params: { top: pageSize, skip: (pageNumber - 1) * pageSize, needTotalCount: true, searchText, type } },
      )
      .then(unwrap);
    return { items: result.items, totalCount: result.totalCount, pageNumber, pageSize };
  },
};
