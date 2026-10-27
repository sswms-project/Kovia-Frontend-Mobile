import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';

import { useInventoryWorkspace } from '@/features/inventory/hooks/use-inventory-workspace';
import { warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';

import { reservationsApi } from '../reservations.api';
import type { InventoryReservation, ReservationListResponse, ReservationStatus } from '../reservations.types';

const PAGE_SIZE = 20;
const getNextPageNumber = (lastPage: ReservationListResponse) =>
  lastPage.pageNumber * lastPage.pageSize < lastPage.totalCount ? lastPage.pageNumber + 1 : undefined;

export function useReservationsQuery(status: ReservationStatus | null) {
  const workspace = useInventoryWorkspace();
  const { canView, warehouseId } = workspace;
  const query = useInfiniteQuery({
    queryKey: canView ? warehouseQueryKey('inventory-reservations', { status }) : ['inventory-reservations', 'disabled'],
    enabled: canView,
    queryFn: ({ pageParam, signal }) => reservationsApi.getReservations({ status: status ?? undefined, warehouseId, pageNumber: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: 1, getNextPageParam: getNextPageNumber, staleTime: 15_000, retry: false,
  });
  return { ...query, workspace };
}

export function flattenReservations(data: InfiniteData<ReservationListResponse> | undefined): readonly InventoryReservation[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}
