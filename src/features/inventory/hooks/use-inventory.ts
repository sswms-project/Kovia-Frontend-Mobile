import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';

import { inventoryApi } from '../inventory.api';
import type {
  InventoryListQuery,
  InventoryStock,
  InventoryStockListResponse,
  StockMovement,
  StockMovementListQuery,
  StockMovementListResponse,
} from '../inventory.types';

export const INVENTORY_QUERY_KEY = ['inventory'] as const;

const PAGE_SIZE = 20;
const STOCK_DETAIL_PAGE_SIZE = 100;
const WAREHOUSE_OPTIONS_STALE_TIME_MS = 5 * 60_000;

export type InventoryFilters = Omit<InventoryListQuery, 'pageNumber' | 'pageSize'>;
export type StockMovementFilters = Omit<StockMovementListQuery, 'pageNumber' | 'pageSize'>;

const getNextPageNumber = (lastPage: { pageNumber: number; pageSize: number; totalCount: number }) =>
  lastPage.pageNumber * lastPage.pageSize < lastPage.totalCount ? lastPage.pageNumber + 1 : undefined;

export function useInventoryQuery(filters: InventoryFilters) {
  return useInfiniteQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'stock', filters],
    queryFn: ({ pageParam }) =>
      inventoryApi.getInventory({ ...filters, pageNumber: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: getNextPageNumber,
  });
}

export function flattenStocks(
  data: InfiniteData<InventoryStockListResponse> | undefined,
): readonly InventoryStock[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}

export function useInventoryWarehouseOptionsQuery() {
  return useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'warehouse-options'],
    queryFn: inventoryApi.getWarehouseOptions,
    staleTime: WAREHOUSE_OPTIONS_STALE_TIME_MS,
  });
}

interface StockIdentity {
  readonly stockId: string;
  readonly productId: string;
  readonly slotId: string;
}

/** There is no get-by-id endpoint, so the row is picked out of the product's rows at that slot. */
export function useInventoryStockQuery({ stockId, productId, slotId }: StockIdentity) {
  return useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'stock-detail', stockId, productId, slotId],
    queryFn: async () => {
      const response = await inventoryApi.getInventory({
        productId,
        slotId,
        pageNumber: 1,
        pageSize: STOCK_DETAIL_PAGE_SIZE,
      });
      return response.items.find((stock) => stock.id === stockId) ?? null;
    },
  });
}

export function useStockMovementsQuery(filters: StockMovementFilters) {
  return useInfiniteQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'movements', filters],
    queryFn: ({ pageParam }) =>
      inventoryApi.getStockMovements({ ...filters, pageNumber: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: getNextPageNumber,
  });
}

export function flattenMovements(
  data: InfiniteData<StockMovementListResponse> | undefined,
): readonly StockMovement[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}
