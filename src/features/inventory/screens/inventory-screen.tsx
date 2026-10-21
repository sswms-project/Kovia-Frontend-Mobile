import { useRouter } from 'expo-router';
import { History, ScanLine } from 'lucide-react-native';
import { useState } from 'react';

import type { FilterOption } from '@/components/ui/filter-chips';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

import { InventoryListView, type InventoryHeaderAction } from '../components/inventory-list-view';
import {
  flattenStocks,
  useInventoryQuery,
  useInventoryWarehouseOptionsQuery,
} from '../hooks/use-inventory';
import type { InventoryStock } from '../inventory.types';

const SEARCH_DEBOUNCE_MS = 350;

interface InventoryScreenProps {
  /** Set when the user comes back from the barcode scanner with a code to look up. */
  readonly initialSearch: string;
}

export function InventoryScreen({ initialSearch }: InventoryScreenProps) {
  const router = useRouter();
  const [searchText, setSearchText] = useState(initialSearch);
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);

  const query = useInventoryQuery({
    searchTerm: debouncedSearch || undefined,
    warehouseId: warehouseId ?? undefined,
  });
  const warehousesQuery = useInventoryWarehouseOptionsQuery();

  const warehouseOptions: readonly FilterOption<string>[] = (warehousesQuery.data ?? []).map(
    (warehouse) => ({
      value: warehouse.id,
      label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
    }),
  );

  const actions: readonly InventoryHeaderAction[] = [
    { label: 'Quét mã sản phẩm', icon: ScanLine, onPress: () => router.push('/inventory/scan') },
    { label: 'Lịch sử biến động', icon: History, onPress: () => router.push('/inventory/movements') },
  ];

  function openStock(stock: InventoryStock) {
    router.push({
      pathname: '/inventory/[stockId]',
      params: { stockId: stock.id, productId: stock.productId, slotId: stock.slotId },
    });
  }

  return (
    <InventoryListView
      searchText={searchText}
      onSearchChange={setSearchText}
      actions={actions}
      warehouseOptions={warehouseOptions}
      warehouseId={warehouseId}
      onWarehouseChange={setWarehouseId}
      items={flattenStocks(query.data)}
      totalCount={query.data?.pages[0]?.totalCount}
      isLoading={query.isPending}
      error={query.error}
      isRefreshing={query.isRefetching && !query.isFetchingNextPage}
      isFetchingNextPage={query.isFetchingNextPage}
      hasFilters={Boolean(debouncedSearch || warehouseId)}
      onRefresh={() => void query.refetch()}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onRetry={() => void query.refetch()}
      onOpenStock={openStock}
    />
  );
}
