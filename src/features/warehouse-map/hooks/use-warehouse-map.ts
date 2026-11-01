import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { P } from '@/config/permission-codes';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';

import { warehouseMapApi } from '../warehouse-map.api';

interface MapTarget { readonly scope: string; readonly slotId: string; readonly title: string }

export function useWarehouseMap(sourceVersion = '', sourceReady = true) {
  const access = useWarehouseAccess();
  const [target, setTarget] = useState<MapTarget | null>(null);
  const scope = JSON.stringify([access.selection.identity, access.selection.signature,
    access.selection.revision, access.warehouse?.id, sourceVersion]);
  const canView = sourceReady && access.ready && !!access.profile.data?.permissions.includes(P.WAREHOUSES_VIEW);
  const visible = canView && !!target && target.scope === scope;
  const query = useQuery({
    queryKey: visible ? warehouseQueryKey('mobile-warehouse-map') : ['mobile-warehouse-map', 'closed'],
    queryFn: ({ signal }) => warehouseMapApi.get(access.warehouse!.id, signal),
    enabled: visible, retry: false, staleTime: 0,
  });
  const open = useCallback((warehouseId: string, slotId: string, title: string) => {
    if (canView && warehouseId.toLowerCase() === access.warehouse?.id.toLowerCase())
      setTarget({ scope, slotId, title });
  }, [canView, access.warehouse?.id, scope]);
  const close = useCallback(() => setTarget(null), []);
  return { canView, open, close, view: { visible, title: visible ? target.title : '',
    slotId: visible ? target.slotId : '', loading: visible && query.isFetching,
    // Do not show stale geometry alongside a refresh failure or while revalidating the layout.
    scene: visible && query.isSuccess && !query.isFetching ? query.data : null,
    error: visible && query.isError ? query.error.message : null,
    onClose: close, onRefresh: () => { void query.refetch(); } } };
}
