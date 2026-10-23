import { useQuery } from '@tanstack/react-query';

import { useWarehouseAccess } from './use-warehouse-access';
import { warehouseQueryKey } from '../warehouse-access';

interface Options<T> {
  readonly permission: string;
  readonly resource: string;
  readonly params?: unknown;
  readonly enabled?: boolean;
  readonly staleTime?: number;
  readonly fetcher: (warehouseId: string, signal: AbortSignal) => Promise<T>;
}

/** Warehouse-scoped, permission-gated query; the key changes with the selected warehouse. */
export function useWarehouseQuery<T>({ permission, resource, params, enabled = true, staleTime = 30_000, fetcher }: Options<T>) {
  const access = useWarehouseAccess();
  const canView = access.ready && !!access.profile.data?.permissions.includes(permission);
  const warehouseId = access.selection.warehouseId;
  const active = canView && !!warehouseId;
  const query = useQuery({
    queryKey: active ? warehouseQueryKey(resource, params) : ['warehouse', 'disabled', resource],
    enabled: active && enabled,
    queryFn: ({ signal }) => fetcher(warehouseId as string, signal),
    staleTime,
    retry: (count, error) => count < 1 && !('statusCode' in error && [401, 403, 404].includes(Number(error.statusCode))),
  });
  return { access, canView, query };
}
