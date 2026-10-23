import { FlashList } from '@shopify/flash-list';
import { Ruler } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterChips, type FilterOption } from '@/components/ui/filter-chips';
import { ListCard } from '@/components/ui/list-card';
import { LoadingState } from '@/components/ui/loading-state';
import { SearchField } from '@/components/ui/search-field';
import { useTheme } from '@/hooks/use-theme';

import { useUnitsQuery } from '../hooks/use-reference-data';
import { REFERENCE_STATUS_LABEL, type ReferenceStatus } from '../reference-data.types';

const STATUS_OPTIONS: readonly FilterOption<ReferenceStatus>[] = [
  { value: 'Active', label: REFERENCE_STATUS_LABEL.Active ?? 'Đang hoạt động' },
  { value: 'Inactive', label: REFERENCE_STATUS_LABEL.Inactive ?? 'Ngừng hoạt động' },
];

export function UnitsScreen() {
  const theme = useTheme();
  const [status, setStatus] = useState<ReferenceStatus>('Active');
  const [searchText, setSearchText] = useState('');
  const query = useUnitsQuery(status);
  const term = searchText.trim().toLowerCase();
  const units = (query.data ?? []).filter(
    (unit) => !term || `${unit.unitName} ${unit.unitCode} ${unit.symbol ?? ''}`.toLowerCase().includes(term),
  );

  function renderBody() {
    if (query.isPending) return <LoadingState message="Đang tải đơn vị tính…" />;
    if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
    if (units.length === 0) return <EmptyState icon={Ruler} title="Không có đơn vị tính phù hợp" />;
    return (
      <FlashList
        data={units}
        keyExtractor={(unit) => unit.id}
        renderItem={({ item }) => (
          <ListCard
            title={item.unitName}
            subtitle={item.symbol ? `${item.unitCode} · ${item.symbol}` : item.unitCode}
            lines={[`Số chữ số thập phân: ${item.quantityPrecision}`, item.description]}
          />
        )}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.listContent}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.padded}>
        <SearchField
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Tìm đơn vị tính"
          accessibilityLabel="Tìm đơn vị tính"
        />
      </View>
      <FilterChips
        accessibilityLabel="Lọc theo trạng thái"
        options={STATUS_OPTIONS}
        value={status}
        onChange={(value) => setStatus(value ?? 'Active')}
        allLabel="Đang hoạt động"
      />
      <View style={styles.body}>{renderBody()}</View>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12, paddingTop: 12 },
  padded: { paddingHorizontal: 20 },
  body: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  separator: { height: 12 },
});
