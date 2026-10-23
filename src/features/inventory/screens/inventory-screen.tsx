import { useRouter } from 'expo-router';
import { History, ScanLine } from 'lucide-react-native';
import { useState } from 'react';

import { WarehouseWorkspaceControl, WarehouseWorkspaceGate } from '@/components/warehouse-workspace';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

import { InventoryListView, type InventoryHeaderAction } from '../components/inventory-list-view';
import { flattenStocks, useInventoryQuery } from '../hooks/use-inventory';
import type { InventoryStock } from '../inventory.types';

export function InventoryScreen({ initialSearch }: { readonly initialSearch: string }) {
  const router = useRouter();
  const [searchText, setSearchText] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(searchText.trim(), 350);
  const query = useInventoryQuery({ searchTerm: debouncedSearch || undefined });
  const actions: readonly InventoryHeaderAction[] = [
    { label: 'Quét mã sản phẩm', icon: ScanLine, onPress: () => router.push('/inventory/scan') },
    { label: 'Lịch sử biến động', icon: History, onPress: () => router.push('/inventory/movements') },
  ];
  function openStock(stock: InventoryStock) {
    if (query.isError || query.isFetching || stock.warehouseId !== query.workspace.warehouseId) return;
    router.push({ pathname: '/inventory/[stockId]', params: {
      stockId: stock.id, productId: stock.productId, slotId: stock.slotId, warehouseId: stock.warehouseId,
    } });
  }
  if (!query.workspace.canView) return <WarehouseWorkspaceGate access={query.workspace.access} message="Bạn chưa có quyền xem tồn kho tại kho này." />;
  return <InventoryListView searchText={searchText} onSearchChange={setSearchText} actions={actions}
    workspaceControl={<WarehouseWorkspaceControl access={query.workspace.access} />}
    items={flattenStocks(query.data)} totalCount={query.isError ? undefined : query.data?.pages[0]?.totalCount}
    isLoading={query.isPending} error={query.error} isRefreshing={query.isRefetching && !query.isFetchingNextPage}
    isFetchingNextPage={query.isFetchingNextPage} hasFilters={!!debouncedSearch}
    onRefresh={() => { void query.refetch(); }} onRetry={() => { void query.refetch(); }} onOpenStock={openStock}
    onEndReached={() => { if (query.hasNextPage && !query.isFetching) void query.fetchNextPage(); }} />;
}
