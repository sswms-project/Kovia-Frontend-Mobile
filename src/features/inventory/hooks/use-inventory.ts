import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';

import { warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';
import { ApiError } from '@/lib/api';

import { inventoryApi } from '../inventory.api';
import { stockIdentitySchema } from '../inventory.schema';
import type { InventoryListQuery, InventoryStock, InventoryStockListResponse, StockMovement, StockMovementListQuery, StockMovementListResponse } from '../inventory.types';
import { useInventoryWorkspace } from './use-inventory-workspace';

export const INVENTORY_QUERY_KEY = ['inventory'] as const;
const PAGE_SIZE = 20;
export type InventoryFilters = Omit<InventoryListQuery, 'pageNumber' | 'pageSize' | 'warehouseId'>;
export type StockMovementFilters = Omit<StockMovementListQuery, 'pageNumber' | 'pageSize' | 'warehouseId'>;
const getNextPageNumber = (lastPage: { pageNumber: number; pageSize: number; totalCount: number }) =>
  lastPage.pageNumber * lastPage.pageSize < lastPage.totalCount ? lastPage.pageNumber + 1 : undefined;

export function useInventoryQuery(filters: InventoryFilters) {
  const workspace = useInventoryWorkspace();
  const { canView, warehouseId } = workspace;
  const query = useInfiniteQuery({
    queryKey: canView ? warehouseQueryKey('inventory-list', filters) : ['inventory', 'disabled'],
    enabled: canView,
    queryFn: ({ pageParam, signal }) => inventoryApi.getInventory({ ...filters, warehouseId, pageNumber: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: 1, getNextPageParam: getNextPageNumber, staleTime: 15_000, retry: false,
  });
  return { ...query, workspace };
}

export function flattenStocks(data: InfiniteData<InventoryStockListResponse> | undefined): readonly InventoryStock[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}

interface StockIdentity {
  readonly stockId: string;
  readonly productId: string;
  readonly slotId: string;
  readonly warehouseId?: string;
}

export function useInventoryStockQuery(identity: StockIdentity) {
  const workspace = useInventoryWorkspace();
  const parsed = stockIdentitySchema.safeParse(identity);
  const { canView, warehouseId } = workspace;
  const query = useQuery({
    queryKey: canView ? warehouseQueryKey('inventory-detail', identity) : ['inventory-detail', 'disabled'],
    enabled: canView && parsed.success,
    queryFn: ({ signal }) => {
      if (!parsed.success) throw new ApiError('Mã tồn kho không hợp lệ.', 400);
      if (identity.warehouseId && identity.warehouseId.toLowerCase() !== warehouseId.toLowerCase())
        throw new ApiError('Dòng tồn thuộc kho khác. Vui lòng mở lại từ kho đang chọn.', 403);
      return inventoryApi.findStock(warehouseId, identity.stockId, identity.productId, identity.slotId, signal);
    },
    staleTime: 0, refetchOnMount: 'always', retry: false,
  });
  return { ...query, workspace, validIdentity: parsed.success };
}

export function useStockMovementsQuery(filters: StockMovementFilters, enabled = true) {
  const workspace = useInventoryWorkspace();
  const { canView, warehouseId } = workspace;
  const query = useInfiniteQuery({
    queryKey: canView ? warehouseQueryKey('inventory-movements', filters) : ['inventory-movements', 'disabled'],
    enabled: canView && enabled,
    queryFn: ({ pageParam, signal }) => inventoryApi.getStockMovements({ ...filters, warehouseId, pageNumber: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: 1, getNextPageParam: getNextPageNumber, staleTime: 15_000, retry: false,
  });
  return { ...query, workspace };
}

export function flattenMovements(data: InfiniteData<StockMovementListResponse> | undefined): readonly StockMovement[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}
