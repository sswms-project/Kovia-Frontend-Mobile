import { useQuery } from '@tanstack/react-query';

import { usePagedQuery } from '@/hooks/use-paged-query';

import { warehouseDirectoryApi } from '../warehouse-directory.api';
import type { LocationType, WarehouseLocation, WarehouseStatus, WarehouseSummary } from '../warehouse-directory.types';

export const WAREHOUSE_DIRECTORY_QUERY_KEY = ['warehouse-directory'] as const;

export interface WarehouseFilters {
  readonly searchText?: string;
  readonly status?: WarehouseStatus;
}

export function useWarehousesQuery(filters: WarehouseFilters) {
  return usePagedQuery<WarehouseSummary>(
    [...WAREHOUSE_DIRECTORY_QUERY_KEY, 'list', filters],
    (pageNumber, pageSize) => warehouseDirectoryApi.list({ ...filters, pageNumber, pageSize }),
  );
}

export interface LocationFilters {
  readonly searchText?: string;
  readonly type?: LocationType;
}

export function useWarehouseLocationsQuery(warehouseId: string, filters: LocationFilters) {
  return usePagedQuery<WarehouseLocation>(
    [...WAREHOUSE_DIRECTORY_QUERY_KEY, 'locations', warehouseId, filters],
    (pageNumber, pageSize) => warehouseDirectoryApi.locations({ ...filters, warehouseId, pageNumber, pageSize }),
    warehouseId !== '',
  );
}

export function useWarehouseDetailQuery(id: string) {
  return useQuery({
    queryKey: [...WAREHOUSE_DIRECTORY_QUERY_KEY, 'detail', id],
    queryFn: () => warehouseDirectoryApi.get(id),
  });
}
