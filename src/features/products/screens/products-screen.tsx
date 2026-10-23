import { router } from 'expo-router';
import { ArrowLeft, Package } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useProducts } from '../hooks/use-products';
import type { Product, StockStatus } from '../products.types';

const PAGE = 20;
const FILTERS: { value: StockStatus | undefined; label: string }[] = [
  { value: undefined, label: 'Tất cả' }, { value: 'LowStock', label: 'Sắp hết' }, { value: 'OutOfStock', label: 'Hết hàng' },
];

export function ProductsScreen({ initialQuery = '' }: { initialQuery?: string }) {
  const theme = useTheme();
  const [text, setText] = useState(initialQuery);
  const [term, setTerm] = useState(initialQuery);
  const [stock, setStock] = useState<StockStatus | undefined>();
  const [pageSize, setPageSize] = useState(PAGE);
  useEffect(() => {
    const t = setTimeout(() => { setTerm(text); setPageSize(PAGE); }, 400);
    return () => clearTimeout(t);
  }, [text]);
  const { canView, query } = useProducts({ searchTerm: term, stockStatus: stock, pageSize });
  const total = query.data?.totalCount ?? 0;
  const items = query.data?.items ?? [];

  const top = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} accessibilityLabel="Quay lại" hitSlop={12}>
        <ArrowLeft size={22} color={theme.text} />
      </Pressable>
      <Text style={[styles.title, { color: theme.text }]}>Sản phẩm</Text>
    </View>
  );
  if (!canView)
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        {top}
        <View style={styles.pad}><AlertBanner title="Bạn chưa được cấp quyền xem sản phẩm hoặc chưa chọn kho làm việc." /></View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      {top}
      <FlatList<Product>
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => { if (items.length < total && !query.isFetching) setPageSize((s) => s + PAGE); }}
        ListHeaderComponent={
          <View style={{ gap: 8 }}>
            <TextField label="Tìm sản phẩm" value={text} onChangeText={setText} placeholder="SKU, tên hoặc mã vạch" returnKeyType="search" />
            <View style={styles.row}>
              {FILTERS.map((f) => (
                <Text key={f.label} onPress={() => { setStock(f.value); setPageSize(PAGE); }}
                  style={[styles.chip, { color: stock === f.value ? theme.onPrimary : theme.text,
                    backgroundColor: stock === f.value ? theme.primary : theme.backgroundElement }]}>{f.label}</Text>
              ))}
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/products/[id]', params: { id: item.id } })}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{item.productName}</Text>
            <Text style={{ color: theme.textSecondary, fontFamily: FontFamily.mono }}>{item.sku}</Text>
            <View style={styles.between}>
              <Text style={{ color: theme.textSecondary }} numberOfLines={1}>{item.categoryName ?? '—'}</Text>
              <Text style={{ color: (item.availableQuantity ?? 1) <= 0 ? theme.error : theme.text, fontFamily: FontFamily.semibold }}>
                {item.availableQuantity ?? 0} {item.unitName ?? ''}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          query.isPending ? <LoadingState message="Đang tải sản phẩm…" />
            : query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} />
              : <EmptyState icon={Package} title="Không có sản phẩm" description="Thử từ khóa hoặc bộ lọc khác." />
        }
        ListFooterComponent={items.length < total && query.isFetching ? <LoadingState message="Đang tải thêm…" /> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontFamily: FontFamily.bold },
  pad: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', fontSize: 13, fontFamily: FontFamily.medium },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 4 },
  name: { fontSize: 15, fontFamily: FontFamily.semibold },
  between: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
});
