import { useRouter } from 'expo-router';
import { PackagePlus } from 'lucide-react-native';
import { useState } from 'react';

import type { FilterOption } from '@/components/ui/filter-chips';
import { ListCard } from '@/components/ui/list-card';
import { PagedList } from '@/components/ui/paged-list';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDisplayDate } from '@/lib/date-format';

import { useInboundRequestsQuery } from '../hooks/use-inbound-requests';
import {
  INBOUND_STATUS_LABEL,
  INBOUND_STATUS_TONE,
  SOURCE_TYPE_LABEL,
  type InboundRequestStatus,
} from '../inbound-requests.types';

const SEARCH_DEBOUNCE_MS = 300;

// Draft is left out: staff never see drafts, the BE excludes them.
const STATUS_VALUES: readonly InboundRequestStatus[] = [
  'PendingApproval',
  'Approved',
  'Sent',
  'Confirmed',
  'PartiallyReceived',
  'Received',
  'Rejected',
  'Cancelled',
  'Closed',
];
const STATUS_OPTIONS: readonly FilterOption<InboundRequestStatus>[] = STATUS_VALUES.map((status) => ({
  value: status,
  label: INBOUND_STATUS_LABEL[status] ?? status,
}));

export function InboundRequestsScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [status, setStatus] = useState<InboundRequestStatus | null>(null);
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const query = useInboundRequestsQuery({ searchTerm: debouncedSearch || undefined, status: status ?? undefined });

  return (
    <PagedList
      query={query}
      keyExtractor={(request) => request.id}
      loadingMessage="Đang tải yêu cầu nhập kho…"
      emptyIcon={PackagePlus}
      emptyTitle="Không có yêu cầu nhập kho phù hợp"
      emptyDescription="Thử đổi từ khóa hoặc bỏ bộ lọc."
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Tìm mã, nhà cung cấp, người tạo"
      filterLabel="Lọc theo trạng thái"
      filterOptions={STATUS_OPTIONS}
      filterValue={status}
      onFilterChange={setStatus}
      renderItem={(request) => (
        <ListCard
          title={request.supplierName ?? request.sourceName ?? 'Chưa xác định nguồn'}
          subtitle={request.inboundRequestCode}
          lines={[
            `${SOURCE_TYPE_LABEL[request.sourceType] ?? request.sourceType} · ${request.warehouseName ?? 'Chưa xác định kho'}`,
            `${request.receivedQuantity.toLocaleString('vi-VN')} / ${request.orderedQuantity.toLocaleString('vi-VN')} đã nhận · ${request.lineCount} dòng`,
            request.expectedDate
              ? `Dự kiến: ${formatDisplayDate(new Date(request.expectedDate))}`
              : 'Chưa có ngày dự kiến',
          ]}
          pill={{
            label: INBOUND_STATUS_LABEL[request.status] ?? request.status,
            tone: INBOUND_STATUS_TONE[request.status] ?? 'neutral',
          }}
          onPress={() =>
            router.push({ pathname: '/catalog/inbound-requests/[requestId]', params: { requestId: request.id } })
          }
        />
      )}
    />
  );
}
