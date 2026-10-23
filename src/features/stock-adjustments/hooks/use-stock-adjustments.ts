import { useQuery } from '@tanstack/react-query';

import { usePagedQuery } from '@/hooks/use-paged-query';

import { stockAdjustmentsApi } from '../stock-adjustments.api';
import type { StockAdjustmentStatus, StockAdjustmentVoucher } from '../stock-adjustments.types';

export const STOCK_ADJUSTMENTS_QUERY_KEY = ['stock-adjustments'] as const;

export interface StockAdjustmentFilters {
  readonly status?: StockAdjustmentStatus;
}

export function useStockAdjustmentsQuery(filters: StockAdjustmentFilters) {
  return usePagedQuery<StockAdjustmentVoucher>(
    [...STOCK_ADJUSTMENTS_QUERY_KEY, 'list', filters],
    (pageNumber, pageSize) => stockAdjustmentsApi.list({ ...filters, pageNumber, pageSize }),
  );
}

export function useStockAdjustmentQuery(id: string) {
  return useQuery({
    queryKey: [...STOCK_ADJUSTMENTS_QUERY_KEY, 'detail', id],
    queryFn: () => stockAdjustmentsApi.get(id),
  });
}
