import { useState } from 'react';

import { WarehouseWorkspaceControl, WarehouseWorkspaceGate } from '@/components/warehouse-workspace';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

import { MovementsListView } from '../components/movements-list-view';
import { flattenMovements, useStockMovementsQuery } from '../hooks/use-inventory';
import type { StockMovementType } from '../inventory.types';

export function MovementsScreen() {
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<StockMovementType | null>(null);
  const debouncedSearch = useDebouncedValue(searchText.trim(), 350);
  const query = useStockMovementsQuery({ searchTerm: debouncedSearch || undefined, movementType: typeFilter ?? undefined });
  if (!query.workspace.canView) return <WarehouseWorkspaceGate access={query.workspace.access} message="Bạn chưa có quyền xem lịch sử tồn kho tại kho này." />;
  return <MovementsListView searchText={searchText} onSearchChange={setSearchText} typeFilter={typeFilter} onTypeChange={setTypeFilter}
    workspaceControl={<WarehouseWorkspaceControl access={query.workspace.access} />}
    movements={flattenMovements(query.data)} isLoading={query.isPending} error={query.error}
    isRefreshing={query.isRefetching && !query.isFetchingNextPage} isFetchingNextPage={query.isFetchingNextPage}
    hasFilters={!!debouncedSearch || !!typeFilter} onRefresh={() => { void query.refetch(); }} onRetry={() => { void query.refetch(); }}
    onEndReached={() => { if (query.hasNextPage && !query.isFetching) void query.fetchNextPage(); }} />;
}
