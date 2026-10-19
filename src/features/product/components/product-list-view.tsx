import { FlashList } from '@shopify/flash-list';
import { Package, ScanLine } from 'lucide-react-native';
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

import { STOCK_STATUS_FILTERS } from '../product.labels';
import type { ProductListItem, ProductStockStatus } from '../product.types';
import { ProductCard } from './product-card';

interface ProductListViewProps {
  readonly searchText: string;
  readonly onSearchChange: (value: string) => void;
  readonly onScan: () => void;
  readonly categoryOptions: readonly FilterOption<string>[];
  readonly categoryId: string | null;
  readonly onCategoryChange: (value: string | null) => void;
  /** Stock filters need inventory permission; without it the row is not shown. */
  readonly canViewInventory: boolean;
  readonly stockStatus: ProductStockStatus | null;
  readonly onStockStatusChange: (value: ProductStockStatus | null) => void;
  readonly products: readonly ProductListItem[];
  readonly totalCount: number | undefined;
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly isRefreshing: boolean;
  readonly isFetchingNextPage: boolean;
  readonly hasFilters: boolean;
  readonly onRefresh: () => void;
  readonly onEndReached: () => void;
  readonly onRetry: () => void;
  readonly onOpenProduct: (product: ProductListItem) => void;
}

export function ProductListView({
  searchText,
  onSearchChange,
  onScan,
  categoryOptions,
  categoryId,
  onCategoryChange,
  canViewInventory,
  stockStatus,
  onStockStatusChange,
  products,
  totalCount,
  isLoading,
  error,
  isRefreshing,
  isFetchingNextPage,
  hasFilters,
  onRefresh,
  onEndReached,
  onRetry,
  onOpenProduct,
}: ProductListViewProps) {
  const theme = useTheme();

  function renderBody() {
    if (isLoading) return <LoadingState message="Đang tải sản phẩm…" />;
    if (error && products.length === 0) return <ErrorState error={error} onRetry={onRetry} />;
    if (products.length === 0) {
      return (
        <EmptyState
          icon={Package}
          title="Không có sản phẩm phù hợp"
          description={
            hasFilters ? 'Thử đổi từ khóa hoặc bỏ bộ lọc.' : 'Chưa có sản phẩm nào để hiển thị.'
          }
        />
      );
    }

    return (
      <FlashList
        data={products}
        keyExtractor={(product) => product.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            showStock={canViewInventory}
            onPress={() => onOpenProduct(item)}
          />
        )}
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
      {totalCount !== undefined ? (
        <Text style={[styles.count, { color: theme.textSecondary }]}>
          {totalCount.toLocaleString('vi-VN')} sản phẩm
        </Text>
      ) : null}

      <View style={styles.searchRow}>
        <SearchField
          value={searchText}
          onChangeText={onSearchChange}
          placeholder="Tìm theo mã, tên hoặc barcode"
          accessibilityLabel="Tìm sản phẩm theo mã, tên hoặc mã vạch"
        />
        <IconButton icon={ScanLine} label="Quét mã sản phẩm" onPress={onScan} />
      </View>

      {categoryOptions.length > 0 ? (
        <FilterChips
          accessibilityLabel="Lọc theo nhóm vật tư hàng hóa"
          options={categoryOptions}
          value={categoryId}
          onChange={onCategoryChange}
          allLabel="Mọi nhóm"
        />
      ) : null}

      {canViewInventory ? (
        <FilterChips
          accessibilityLabel="Lọc theo tình trạng tồn"
          options={STOCK_STATUS_FILTERS}
          value={stockStatus}
          onChange={onStockStatusChange}
          allLabel="Mọi tình trạng"
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
  root: { flex: 1, gap: 12, paddingTop: 8 },
  count: { fontFamily: FontFamily.regular, fontSize: 13, paddingHorizontal: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  body: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  separator: { height: 12 },
  footer: { paddingVertical: 16 },
});
