import { MapPin } from 'lucide-react-native';
import { useState } from 'react';

import type { FilterOption } from '@/components/ui/filter-chips';
import { PagedList } from '@/components/ui/paged-list';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

import { LocationCard } from '../components/location-card';
import { useWarehouseLocationsQuery } from '../hooks/use-warehouse-directory';
import { LOCATION_TYPE_LABEL, type LocationType } from '../warehouse-directory.types';

const SEARCH_DEBOUNCE_MS = 300;

const TYPE_OPTIONS: readonly FilterOption<LocationType>[] = (['Zone', 'Rack', 'Slot'] as const).map((type) => ({
  value: type,
  label: LOCATION_TYPE_LABEL[type] ?? type,
}));

interface WarehouseLocationsScreenProps {
  readonly warehouseId: string;
}

export function WarehouseLocationsScreen({ warehouseId }: WarehouseLocationsScreenProps) {
  const [searchText, setSearchText] = useState('');
  const [type, setType] = useState<LocationType | null>(null);
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const query = useWarehouseLocationsQuery(warehouseId, {
    searchText: debouncedSearch || undefined,
    type: type ?? undefined,
  });

  return (
    <PagedList
      query={query}
      keyExtractor={(location) => location.id}
      renderItem={(location) => <LocationCard location={location} />}
      loadingMessage="Đang tải vị trí kho…"
      emptyIcon={MapPin}
      emptyTitle="Không có vị trí phù hợp"
      emptyDescription="Thử đổi từ khóa hoặc bỏ bộ lọc loại vị trí."
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Tìm mã hoặc tên khu, kệ, ô"
      filterLabel="Lọc theo loại vị trí"
      filterOptions={TYPE_OPTIONS}
      filterValue={type}
      onFilterChange={setType}
    />
  );
}
