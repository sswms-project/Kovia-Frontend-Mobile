import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { LayoutScene, LocationItem, LocationSearchParams } from './warehouse-locations.types';

export const warehouseLocationsApi = {
  scene: (warehouseId: string, signal?: AbortSignal) =>
    api.get<ApiResponse<LayoutScene>>(`/warehouses/${warehouseId}/layout/scene`, { signal }).then(unwrap),
  search: (warehouseId: string, p: LocationSearchParams, signal?: AbortSignal) =>
    api.get<ApiResponse<{ items: LocationItem[]; totalCount: number }>>(`/warehouses/${warehouseId}/locations`, {
      params: {
        top: 50, skip: 0, needTotalCount: true, searchText: p.searchText?.trim() || undefined,
        type: p.type, occupancyStatus: p.occupancyStatus,
      },
      signal,
    }).then(unwrap),
};
