import { P } from '@/config/permission-codes';
import { useWarehouseQuery } from '@/features/warehouse-access/hooks/use-warehouse-query';

import { warehouseLocationsApi } from '../warehouse-locations.api';
import type { LocationSearchParams } from '../warehouse-locations.types';

export const useLayoutScene = () => useWarehouseQuery({
  permission: P.WAREHOUSES_VIEW, resource: 'layout-scene', staleTime: 60_000,
  fetcher: (id, signal) => warehouseLocationsApi.scene(id, signal),
});

export const useLocationSearch = (params: LocationSearchParams) => useWarehouseQuery({
  permission: P.WAREHOUSES_VIEW, resource: 'locations', params,
  fetcher: (id, signal) => warehouseLocationsApi.search(id, params, signal),
});
