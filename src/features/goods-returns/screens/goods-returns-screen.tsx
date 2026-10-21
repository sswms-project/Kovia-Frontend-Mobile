import { useRouter } from 'expo-router';
import { Undo2 } from 'lucide-react-native';
import { useState } from 'react';

import type { FilterOption } from '@/components/ui/filter-chips';
import { ListCard } from '@/components/ui/list-card';
import { PagedList } from '@/components/ui/paged-list';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDisplayDateTime } from '@/lib/date-format';

import { useGoodsReturnsQuery } from '../hooks/use-goods-returns';
import { RETURN_STATUS_LABEL, RETURN_STATUS_TONE, type GoodsReturnStatus } from '../goods-returns.types';

const SEARCH_DEBOUNCE_MS = 300;

const STATUS_VALUES: readonly GoodsReturnStatus[] = ['Requested', 'Approved', 'Rejected', 'Restocked'];
const STATUS_OPTIONS: readonly FilterOption<GoodsReturnStatus>[] = STATUS_VALUES.map((status) => ({
  value: status,
  label: RETURN_STATUS_LABEL[status] ?? status,
}));

export function GoodsReturnsScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [status, setStatus] = useState<GoodsReturnStatus | null>(null);
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const query = useGoodsReturnsQuery({ searchTerm: debouncedSearch || undefined, status: status ?? undefined });

  return (
    <PagedList
      query={query}
      keyExtractor={(request) => request.id}
      loadingMessage="Đang tải yêu cầu trả hàng…"
      emptyIcon={Undo2}
      emptyTitle="Không có yêu cầu trả hàng phù hợp"
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Tìm mã trả hàng hoặc mã xuất kho"
      filterLabel="Lọc theo trạng thái"
      filterOptions={STATUS_OPTIONS}
      filterValue={status}
      onFilterChange={setStatus}
      renderItem={(request) => (
        <ListCard
          title={request.goodsReturnRequestCode}
          subtitle={`Xuất kho ${request.stockIssueRequestCode}`}
          lines={[request.reason, `Tạo lúc ${formatDisplayDateTime(new Date(request.createdAt))}`]}
          pill={{
            label: RETURN_STATUS_LABEL[request.status] ?? request.status,
            tone: RETURN_STATUS_TONE[request.status] ?? 'neutral',
          }}
          onPress={() =>
            router.push({ pathname: '/catalog/goods-returns/[returnId]', params: { returnId: request.id } })
          }
        />
      )}
    />
  );
}
