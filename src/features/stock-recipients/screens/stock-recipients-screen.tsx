import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useState } from 'react';

import type { FilterOption } from '@/components/ui/filter-chips';
import { ListCard } from '@/components/ui/list-card';
import { PagedList } from '@/components/ui/paged-list';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

import { useStockRecipientsQuery } from '../hooks/use-stock-recipients';
import { RECIPIENT_STATUS_LABEL, type RecipientStatus } from '../stock-recipients.types';

const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS: readonly FilterOption<RecipientStatus>[] = [
  { value: 'Active', label: RECIPIENT_STATUS_LABEL.Active ?? 'Đang hoạt động' },
  { value: 'Inactive', label: RECIPIENT_STATUS_LABEL.Inactive ?? 'Ngừng hoạt động' },
];

export function StockRecipientsScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [status, setStatus] = useState<RecipientStatus | null>(null);
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const query = useStockRecipientsQuery({ searchTerm: debouncedSearch || undefined, status: status ?? undefined });

  return (
    <PagedList
      query={query}
      keyExtractor={(recipient) => recipient.id}
      loadingMessage="Đang tải đơn vị nhận hàng…"
      emptyIcon={Users}
      emptyTitle="Chưa có đơn vị nhận hàng phù hợp"
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Mã, tên hoặc số điện thoại"
      filterLabel="Lọc theo trạng thái"
      filterOptions={STATUS_OPTIONS}
      filterValue={status}
      onFilterChange={setStatus}
      renderItem={(recipient) => (
        <ListCard
          title={recipient.recipientName}
          subtitle={recipient.recipientCode}
          lines={[recipient.phone, recipient.email]}
          pill={{
            label: RECIPIENT_STATUS_LABEL[recipient.status] ?? recipient.status,
            tone: recipient.status === 'Active' ? 'success' : 'neutral',
          }}
          onPress={() =>
            router.push({ pathname: '/catalog/stock-recipients/[recipientId]', params: { recipientId: recipient.id } })
          }
        />
      )}
    />
  );
}
