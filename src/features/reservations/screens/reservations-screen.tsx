import { useState } from 'react';

import { WarehouseWorkspaceControl, WarehouseWorkspaceGate } from '@/components/warehouse-workspace';

import { ReservationsListView } from '../components/reservations-list-view';
import { flattenReservations, useReservationsQuery } from '../hooks/use-reservations';
import type { ReservationStatus } from '../reservations.types';

export function ReservationsScreen() {
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | null>(null);
  const query = useReservationsQuery(statusFilter);
  if (!query.workspace.canView) return <WarehouseWorkspaceGate access={query.workspace.access} message="Bạn chưa có quyền xem giữ chỗ tồn kho tại kho này." />;
  return <ReservationsListView statusFilter={statusFilter} onStatusChange={setStatusFilter}
    workspaceControl={<WarehouseWorkspaceControl access={query.workspace.access} />}
    reservations={flattenReservations(query.data)} isLoading={query.isPending} error={query.error}
    isRefreshing={query.isRefetching && !query.isFetchingNextPage} isFetchingNextPage={query.isFetchingNextPage}
    onRefresh={() => { void query.refetch(); }} onRetry={() => { void query.refetch(); }}
    onEndReached={() => { if (query.hasNextPage && !query.isFetching) void query.fetchNextPage(); }} />;
}
