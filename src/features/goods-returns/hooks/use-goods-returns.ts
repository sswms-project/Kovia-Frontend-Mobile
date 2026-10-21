import { useQuery } from '@tanstack/react-query';

import { usePagedQuery } from '@/hooks/use-paged-query';

import { goodsReturnsApi } from '../goods-returns.api';
import type { GoodsReturnRequest, GoodsReturnStatus } from '../goods-returns.types';

export const GOODS_RETURNS_QUERY_KEY = ['goods-return-requests'] as const;

export interface GoodsReturnFilters {
  readonly searchTerm?: string;
  readonly status?: GoodsReturnStatus;
}

export function useGoodsReturnsQuery(filters: GoodsReturnFilters) {
  return usePagedQuery<GoodsReturnRequest>([...GOODS_RETURNS_QUERY_KEY, 'list', filters], (pageNumber, pageSize) =>
    goodsReturnsApi.list({ ...filters, pageNumber, pageSize }),
  );
}

export function useGoodsReturnQuery(id: string) {
  return useQuery({
    queryKey: [...GOODS_RETURNS_QUERY_KEY, 'detail', id],
    queryFn: () => goodsReturnsApi.get(id),
  });
}
