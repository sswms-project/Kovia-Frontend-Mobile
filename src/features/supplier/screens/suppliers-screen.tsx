import { useRouter } from 'expo-router';
import { Truck } from 'lucide-react-native';
import { useState } from 'react';

import type { FilterOption } from '@/components/ui/filter-chips';
import { ListCard } from '@/components/ui/list-card';
import { PagedList } from '@/components/ui/paged-list';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

import { useSuppliersQuery } from '../hooks/use-suppliers';
import { SUPPLIER_STATUS_LABEL, type SupplierStatus } from '../supplier.types';

const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS: readonly FilterOption<SupplierStatus>[] = [
  { value: 'Active', label: SUPPLIER_STATUS_LABEL.Active ?? 'Đang hoạt động' },
  { value: 'Inactive', label: SUPPLIER_STATUS_LABEL.Inactive ?? 'Ngừng hoạt động' },
];

export function SuppliersScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [status, setStatus] = useState<SupplierStatus | null>(null);
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const query = useSuppliersQuery({ searchTerm: debouncedSearch || undefined, status: status ?? undefined });

  return (
    <PagedList
      query={query}
      keyExtractor={(supplier) => supplier.id}
      loadingMessage="Đang tải nhà cung cấp…"
      emptyIcon={Truck}
      emptyTitle="Không có nhà cung cấp phù hợp"
      emptyDescription="Thử đổi từ khóa hoặc bỏ bộ lọc."
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Tìm mã, tên nhà cung cấp"
      filterLabel="Lọc theo trạng thái"
      filterOptions={STATUS_OPTIONS}
      filterValue={status}
      onFilterChange={setStatus}
      renderItem={(supplier) => (
        <ListCard
          title={supplier.supplierName}
          subtitle={supplier.supplierCode}
          lines={[supplier.phone, supplier.contactName ? `Liên hệ: ${supplier.contactName}` : null]}
          pill={{
            label: SUPPLIER_STATUS_LABEL[supplier.status] ?? supplier.status,
            tone: supplier.status === 'Active' ? 'success' : 'neutral',
          }}
          onPress={() =>
            router.push({ pathname: '/catalog/suppliers/[supplierId]', params: { supplierId: supplier.id } })
          }
        />
      )}
    />
  );
}
