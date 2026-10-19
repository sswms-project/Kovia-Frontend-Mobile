import { FlashList } from '@shopify/flash-list';
import { History } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterChips } from '@/components/ui/filter-chips';
import { LoadingState } from '@/components/ui/loading-state';
import { SearchField } from '@/components/ui/search-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { MOVEMENT_TYPE_FILTERS } from '../inventory.labels';
import type { StockMovement, StockMovementType } from '../inventory.types';
import { MovementCard } from './movement-card';

interface MovementsListViewProps {
  readonly searchText: string;
  readonly onSearchChange: (value: string) => void;
  readonly typeFilter: StockMovementType | null;
  readonly onTypeChange: (value: StockMovementType | null) => void;
  readonly movements: readonly StockMovement[];
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly isRefreshing: boolean;
  readonly isFetchingNextPage: boolean;
  readonly hasFilters: boolean;
  readonly onRefresh: () => void;
  readonly onEndReached: () => void;
  readonly onRetry: () => void;
}

export function MovementsListView({
  searchText,
  onSearchChange,
  typeFilter,
  onTypeChange,
  movements,
  isLoading,
  error,
  isRefreshing,
  isFetchingNextPage,
  hasFilters,
  onRefresh,
  onEndReached,
  onRetry,
}: MovementsListViewProps) {
  const theme = useTheme();

  function renderBody() {
    if (isLoading) return <LoadingState message="Đang tải lịch sử biến động…" />;
    if (error && movements.length === 0) return <ErrorState error={error} onRetry={onRetry} />;
    if (movements.length === 0) {
      return (
        <EmptyState
          icon={History}
          title="Chưa có biến động"
          description={
            hasFilters
              ? 'Thử đổi từ khóa hoặc bỏ lọc loại biến động.'
              : 'Các lần nhập, xuất, điều chuyển sẽ xuất hiện tại đây.'
          }
        />
      );
    }

    return (
      <FlashList
        data={movements}
        keyExtractor={(movement) => movement.id}
        renderItem={({ item }) => <MovementCard movement={item} />}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={theme.primary} /> : null
        }
      />
    );
  }

  return (
    <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.background }]}>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Mọi lần tồn kho thay đổi, mới nhất ở trên cùng.
      </Text>
      <View style={styles.searchRow}>
        <SearchField
          value={searchText}
          onChangeText={onSearchChange}
          placeholder="Tìm SKU hoặc tên sản phẩm"
          accessibilityLabel="Tìm trong lịch sử biến động"
        />
      </View>
      <FilterChips
        accessibilityLabel="Lọc theo loại biến động"
        options={MOVEMENT_TYPE_FILTERS}
        value={typeFilter}
        onChange={onTypeChange}
        allLabel="Mọi loại"
      />
      <View style={styles.body}>{renderBody()}</View>
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12, paddingTop: 8 },
  description: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19, paddingHorizontal: 20 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 20 },
  body: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  separator: { height: 10 },
  footer: { paddingVertical: 16 },
});
