import { FlashList } from '@shopify/flash-list';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { SearchX, type LucideIcon } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import type { FilterOption } from '@/components/ui/filter-chips';
import { SelectionField } from '@/components/ui/selection-field';
import { AlertBanner } from '@/components/ui/alert-banner';
import { LoadingState } from '@/components/ui/loading-state';
import { SearchField } from '@/components/ui/search-field';
import { flattenPages, type PageResult } from '@/hooks/use-paged-query';
import { useTheme } from '@/hooks/use-theme';

interface PagedListProps<TItem, TFilter extends string> {
  readonly query: UseInfiniteQueryResult<InfiniteData<PageResult<TItem>>, Error>;
  readonly keyExtractor: (item: TItem) => string;
  readonly renderItem: (item: TItem) => ReactElement;
  readonly loadingMessage?: string;
  readonly emptyTitle: string;
  readonly emptyDescription?: string;
  readonly emptyIcon?: LucideIcon;
  readonly searchText?: string;
  readonly onSearchChange?: (value: string) => void;
  readonly searchPlaceholder?: string;
  readonly filterLabel?: string;
  readonly filterOptions?: readonly FilterOption<TFilter>[];
  readonly filterValue?: TFilter | null;
  readonly onFilterChange?: (value: TFilter | null) => void;
  readonly header?: ReactElement;
}

/** Search, accessible dropdown and infinite list for read-only catalogs. */
export function PagedList<TItem, TFilter extends string = string>({
  query,
  keyExtractor,
  renderItem,
  loadingMessage = 'Đang tải…',
  emptyTitle,
  emptyDescription,
  emptyIcon = SearchX,
  searchText,
  onSearchChange,
  searchPlaceholder,
  filterLabel,
  filterOptions,
  filterValue,
  onFilterChange,
  header,
}: PagedListProps<TItem, TFilter>) {
  const theme = useTheme();
  const items = flattenPages(query.data);

  function renderBody() {
    if (query.isPending) return <LoadingState message={loadingMessage} />;
    if (query.isError) {
      return <View style={styles.padded}>
        {items.length > 0 && <AlertBanner title="Chưa thể tải dữ liệu mới. Tải lại trước khi mở nội dung." />}
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </View>;
    }
    if (items.length === 0) {
      return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
    }
    return (
      <FlashList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => renderItem(item)}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => void query.refetch()}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={theme.primary} /> : null
        }
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {header}
      {onSearchChange ? (
        <View style={styles.padded}>
          <SearchField
            value={searchText ?? ''}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder ?? 'Tìm kiếm'}
            accessibilityLabel={searchPlaceholder ?? 'Tìm kiếm'}
          />
        </View>
      ) : null}
      {filterOptions && onFilterChange ? (
        <View style={styles.padded}><SelectionField label={filterLabel ?? 'Bộ lọc'} value={filterValue ?? ''}
          options={[{ value: '', label: 'Tất cả' }, ...filterOptions]}
          onChange={(value) => onFilterChange(filterOptions.find((option) => option.value === value)?.value ?? null)} /></View>
      ) : null}
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
  footer: { paddingVertical: 16 },
});
