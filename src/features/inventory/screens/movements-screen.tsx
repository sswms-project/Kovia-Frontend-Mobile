import { useState } from 'react';

import { useDebouncedValue } from '@/hooks/use-debounced-value';

import { MovementsListView } from '../components/movements-list-view';
import { flattenMovements, useStockMovementsQuery } from '../hooks/use-inventory';
import type { StockMovementType } from '../inventory.types';

const SEARCH_DEBOUNCE_MS = 350;

export function MovementsScreen() {
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<StockMovementType | null>(null);
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);

  const query = useStockMovementsQuery({
    searchTerm: debouncedSearch || undefined,
    movementType: typeFilter ?? undefined,
  });

  return (
    <MovementsListView
      searchText={searchText}
      onSearchChange={setSearchText}
      typeFilter={typeFilter}
      onTypeChange={setTypeFilter}
      movements={flattenMovements(query.data)}
      isLoading={query.isPending}
      error={query.error}
      isRefreshing={query.isRefetching && !query.isFetchingNextPage}
      isFetchingNextPage={query.isFetchingNextPage}
      hasFilters={Boolean(debouncedSearch || typeFilter)}
      onRefresh={() => void query.refetch()}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onRetry={() => void query.refetch()}
    />
  );
}
