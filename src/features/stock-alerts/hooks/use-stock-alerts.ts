import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';

import { P } from '@/config/permission-codes';
import { useCan } from '@/features/auth/hooks/use-can';
import { useMe } from '@/features/auth/hooks/use-me';

import { stockAlertsApi } from '../stock-alerts.api';
import type { ExpiryAlertPage, StockAlertParams, ThresholdAlertPage } from '../stock-alerts.types';

type AlertPage = ThresholdAlertPage | ExpiryAlertPage;

export function useStockAlertsQuery(params: StockAlertParams) {
  const canView = useCan(P.DASHBOARD_VIEW);
  const { data: me } = useMe();
  const isExpiry = params.kind === 'expiring' || params.kind === 'expired';
  const query = useInfiniteQuery<AlertPage>({
    queryKey: ['stock-alerts', me?.id ?? null, params],
    enabled: canView,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => isExpiry
      ? stockAlertsApi.expiry(params, pageParam as number, signal)
      : stockAlertsApi.thresholds(params, pageParam as number, signal),
    getNextPageParam: (last) => last.pageNumber * last.pageSize < last.totalCount ? last.pageNumber + 1 : undefined,
    staleTime: 30_000, retry: false,
  });
  return { ...query, canView };
}

const SUMMARY_KINDS = ['below-minimum', 'above-maximum', 'expiring', 'expired'] as const;

export function useStockAlertCounts(warehouseId: string | null) {
  const canView = useCan(P.DASHBOARD_VIEW);
  const { data: me } = useMe();
  const results = useQueries({
    queries: SUMMARY_KINDS.map((kind) => ({
      queryKey: ['stock-alerts', me?.id ?? null, 'count', kind, warehouseId],
      enabled: canView && !!warehouseId,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        stockAlertsApi.count({ kind, warehouseId, expiringDays: 5, search: '' }, signal),
      staleTime: 30_000, retry: false,
    })),
  });
  return {
    canView,
    isError: results.some((r) => r.isError),
    isPending: results.some((r) => r.isPending),
    refetch: () => { results.forEach((r) => { void r.refetch(); }); },
    counts: SUMMARY_KINDS.map((kind, i) => ({ kind, total: results[i].data?.total ?? 0 })),
  };
}

export function useAlertWarehousesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['stock-alerts', 'warehouses'],
    enabled,
    queryFn: ({ signal }) => stockAlertsApi.warehouses(signal),
    staleTime: 5 * 60_000, retry: false,
  });
}
