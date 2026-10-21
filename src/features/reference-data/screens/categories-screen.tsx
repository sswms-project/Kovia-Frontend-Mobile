import { FlashList } from '@shopify/flash-list';
import { FolderTree } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListCard } from '@/components/ui/list-card';
import { LoadingState } from '@/components/ui/loading-state';
import { SearchField } from '@/components/ui/search-field';
import { useTheme } from '@/hooks/use-theme';

import { useCategoriesTreeQuery } from '../hooks/use-reference-data';

export function CategoriesScreen() {
  const theme = useTheme();
  const [searchText, setSearchText] = useState('');
  const query = useCategoriesTreeQuery('Active');
  const term = searchText.trim().toLowerCase();
  // categoryPath already reads parent > child, so sorting on it keeps children under their parent.
  const categories = [...(query.data ?? [])]
    .filter((category) => !term || `${category.categoryName} ${category.categoryCode}`.toLowerCase().includes(term))
    .sort((a, b) => a.categoryPath.localeCompare(b.categoryPath, 'vi'));

  function renderBody() {
    if (query.isPending) return <LoadingState message="Đang tải loại sản phẩm…" />;
    if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
    if (categories.length === 0) return <EmptyState icon={FolderTree} title="Không có loại sản phẩm phù hợp" />;
    return (
      <FlashList
        data={categories}
        keyExtractor={(category) => category.id}
        renderItem={({ item }) => (
          <View style={{ marginLeft: Math.min(item.level, 4) * 12 }}>
            <ListCard
              title={item.categoryName}
              subtitle={item.categoryCode}
              lines={[item.level > 0 ? item.categoryPath : null, item.description]}
            />
          </View>
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
          placeholder="Tìm loại sản phẩm"
          accessibilityLabel="Tìm loại sản phẩm"
        />
      </View>
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
