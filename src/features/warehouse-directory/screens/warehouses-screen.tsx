import { useRouter } from 'expo-router';
import { Warehouse } from 'lucide-react-native';
import { useState } from 'react';

import type { FilterOption } from '@/components/ui/filter-chips';
import { ListCard } from '@/components/ui/list-card';
import { PagedList } from '@/components/ui/paged-list';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

import { useWarehousesQuery } from '../hooks/use-warehouse-directory';
import { WAREHOUSE_STATUS_LABEL, type WarehouseStatus } from '../warehouse-directory.types';

const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS: readonly FilterOption<WarehouseStatus>[] = [
  { value: 'Active', label: WAREHOUSE_STATUS_LABEL.Active ?? 'Đang hoạt động' },
  { value: 'Inactive', label: WAREHOUSE_STATUS_LABEL.Inactive ?? 'Ngừng hoạt động' },
];

export function WarehousesScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [status, setStatus] = useState<WarehouseStatus | null>(null);
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const query = useWarehousesQuery({ searchText: debouncedSearch || undefined, status: status ?? undefined });

  return (
    <PagedList
      query={query}
      keyExtractor={(warehouse) => warehouse.id}
      loadingMessage="Đang tải danh sách kho…"
      emptyIcon={Warehouse}
      emptyTitle="Không có kho phù hợp"
      emptyDescription="Bạn chỉ xem được các kho được giao."
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Tìm mã hoặc tên kho"
      filterLabel="Lọc theo trạng thái"
      filterOptions={STATUS_OPTIONS}
      filterValue={status}
      onFilterChange={setStatus}
      renderItem={(warehouse) => (
        <ListCard
          title={warehouse.warehouseName}
          subtitle={warehouse.warehouseCode}
          lines={[warehouse.address, warehouse.managerName ? `Quản lý: ${warehouse.managerName}` : null]}
          pill={{
            label: WAREHOUSE_STATUS_LABEL[warehouse.status] ?? warehouse.status,
            tone: warehouse.status === 'Active' ? 'success' : 'neutral',
          }}
          onPress={() =>
            router.push({ pathname: '/catalog/warehouses/[warehouseId]', params: { warehouseId: warehouse.id } })
          }
        />
      )}
    />
  );
}
