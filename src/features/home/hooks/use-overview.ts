import { useQuery } from '@tanstack/react-query';

import { P } from '@/config/permission-codes';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';

import { homeApi } from '../home.api';

export function useOverview() {
  const access = useWarehouseAccess();
  const allowed = access.ready && !!access.profile.data?.permissions.includes(P.DASHBOARD_VIEW);
  const query = useQuery({
    queryKey: allowed ? warehouseQueryKey('dashboard-overview') : ['dashboard-overview', 'disabled'],
    queryFn: ({ signal }) => homeApi.overview(access.warehouse?.id ?? '', 30, signal),
    enabled: allowed, staleTime: 30_000, retry: false,
  });
  return { ...query, allowed };
}
