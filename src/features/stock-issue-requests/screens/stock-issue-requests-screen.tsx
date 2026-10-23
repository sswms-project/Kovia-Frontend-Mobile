import { useRouter } from 'expo-router';
import { PackageMinus } from 'lucide-react-native';
import { useState } from 'react';

import type { FilterOption } from '@/components/ui/filter-chips';
import { ListCard } from '@/components/ui/list-card';
import { PagedList } from '@/components/ui/paged-list';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDisplayDateTime } from '@/lib/date-format';

import { useStockIssueRequestsQuery } from '../hooks/use-stock-issue-requests';
import {
  STOCK_ISSUE_STATUS_LABEL,
  STOCK_ISSUE_STATUS_TONE,
  type StockIssueStatus,
} from '../stock-issue-requests.types';

const SEARCH_DEBOUNCE_MS = 300;

type IssueFilter = StockIssueStatus | 'mine';

const STATUS_VALUES: readonly StockIssueStatus[] = [
  'Pending',
  'ReleasedForPicking',
  'Picking',
  'Picked',
  'AuthorizedForDispatch',
  'Dispatched',
  'Cancelled',
];
const FILTER_OPTIONS: readonly FilterOption<IssueFilter>[] = [
  { value: 'mine', label: 'Giao cho tôi' },
  ...STATUS_VALUES.map((status) => ({ value: status, label: STOCK_ISSUE_STATUS_LABEL[status] ?? status })),
];

export function StockIssueRequestsScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState<IssueFilter | null>(null);
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const query = useStockIssueRequestsQuery({
    searchTerm: debouncedSearch || undefined,
    assignedToMe: filter === 'mine' ? true : undefined,
    status: filter && filter !== 'mine' ? filter : undefined,
  });

  return (
    <PagedList
      query={query}
      keyExtractor={(request) => request.id}
      loadingMessage="Đang tải yêu cầu xuất kho…"
      emptyIcon={PackageMinus}
      emptyTitle="Không có yêu cầu xuất kho phù hợp"
      emptyDescription="Thử đổi từ khóa hoặc bỏ bộ lọc."
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Tìm mã, người nhận, sản phẩm"
      filterLabel="Lọc yêu cầu xuất kho"
      filterOptions={FILTER_OPTIONS}
      filterValue={filter}
      onFilterChange={setFilter}
      renderItem={(request) => {
        const pickedLines = request.items.filter((item) => item.pickedQuantity >= item.quantity).length;
        return (
          <ListCard
            title={request.recipientName}
            subtitle={request.stockIssueRequestCode}
            lines={[
              request.warehouseName,
              `Đã lấy ${pickedLines}/${request.items.length} dòng`,
              request.assignedStaffName ? `Người lấy hàng: ${request.assignedStaffName}` : 'Chưa phân công lấy hàng',
              `Tạo lúc ${formatDisplayDateTime(new Date(request.createdAt))}`,
            ]}
            pill={{
              label: STOCK_ISSUE_STATUS_LABEL[request.status] ?? request.status,
              tone: STOCK_ISSUE_STATUS_TONE[request.status] ?? 'neutral',
            }}
            onPress={() =>
              router.push({
                pathname: '/catalog/stock-issue-requests/[requestId]',
                params: { requestId: request.id },
              })
            }
          />
        );
      }}
    />
  );
}
