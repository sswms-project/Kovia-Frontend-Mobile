import { FlashList } from '@shopify/flash-list';
import { PackageSearch, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterChips, type FilterOption } from '@/components/ui/filter-chips';
import { IconButton } from '@/components/ui/icon-button';
import { LoadingState } from '@/components/ui/loading-state';
import { SearchField } from '@/components/ui/search-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { InventoryStock } from '../inventory.types';
import { InventoryCard } from './inventory-card';

export interface InventoryHeaderAction {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly onPress: () => void;
}

interface InventoryListViewProps {
  readonly searchText: string;
  readonly onSearchChange: (value: string) => void;
  readonly actions: readonly InventoryHeaderAction[];
  readonly warehouseOptions: readonly FilterOption<string>[];
  readonly warehouseId: string | null;
  readonly onWarehouseChange: (value: string | null) => void;
  readonly items: readonly InventoryStock[];
  readonly totalCount: number | undefined;
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly isRefreshing: boolean;
  readonly isFetchingNextPage: boolean;
  readonly hasFilters: boolean;
  readonly onRefresh: () => void;
  readonly onEndReached: () => void;
  readonly onRetry: () => void;
  readonly onOpenStock: (stock: InventoryStock) => void;
}

export function InventoryListView({
  searchText,
  onSearchChange,
  actions,
  warehouseOptions,
  warehouseId,
  onWarehouseChange,
  items,
  totalCount,
  isLoading,
  error,
  isRefreshing,
  isFetchingNextPage,
  hasFilters,
  onRefresh,
  onEndReached,
  onRetry,
  onOpenStock,
}: InventoryListViewProps) {
  const theme = useTheme();

  function renderBody() {
    if (isLoading) return <LoadingState message="Đang tải tồn kho…" />;
    if (error && items.length === 0) return <ErrorState error={error} onRetry={onRetry} />;
    if (items.length === 0) {
      return (
        <EmptyState
          icon={PackageSearch}
          title="Không có tồn kho phù hợp"
          description={
            hasFilters ? 'Thử đổi từ khóa hoặc bỏ bộ lọc kho.' : 'Chưa có số dư tồn kho để hiển thị.'
          }
        />
      );
    }

    return (
      <FlashList
        data={items}
        keyExtractor={(stock) => stock.id}
        renderItem={({ item }) => <InventoryCard stock={item} onPress={() => onOpenStock(item)} />}
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
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.titleBlock}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          Tồn kho
        </Text>
        {totalCount !== undefined ? (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {totalCount.toLocaleString('vi-VN')} dòng tồn
          </Text>
        ) : null}
      </View>

      <View style={styles.searchRow}>
        <SearchField
          value={searchText}
          onChangeText={onSearchChange}
          placeholder="Tìm SKU hoặc tên sản phẩm"
          accessibilityLabel="Tìm sản phẩm tồn kho"
        />
        {actions.map((action) => (
          <IconButton key={action.label} icon={action.icon} label={action.label} onPress={action.onPress} />
        ))}
      </View>

      {warehouseOptions.length > 1 ? (
        <FilterChips
          accessibilityLabel="Lọc theo kho"
          options={warehouseOptions}
          value={warehouseId}
          onChange={onWarehouseChange}
          allLabel="Mọi kho"
        />
      ) : null}

      <View style={styles.body}>{renderBody()}</View>
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12, paddingTop: 12 },
  titleBlock: { gap: 2, paddingHorizontal: 20 },
  title: { fontFamily: FontFamily.semibold, fontSize: 26, lineHeight: 32 },
  subtitle: { fontFamily: FontFamily.regular, fontSize: 13 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  body: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  separator: { height: 12 },
  footer: { paddingVertical: 16 },
});
