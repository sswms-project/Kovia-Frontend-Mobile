import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useProduct } from '../hooks/use-products';

export function ProductDetailScreen({ productId }: { productId: string }) {
  const theme = useTheme();
  const { canView, query } = useProduct(productId);
  const p = query.data;
  const rows: [string, string | number | null | undefined][] = p ? [
    ['SKU', p.sku], ['Mã vạch', p.barcodeValue], ['Danh mục', p.categoryPath ?? p.categoryName],
    ['Đơn vị', p.unitName], ['Tồn kho', p.quantityOnHand], ['Đã giữ', p.reservedQuantity], ['Khả dụng', p.availableQuantity],
    ['Quản lý theo lô', p.isLotTracked ? 'Có' : 'Không'], ['Hạn sử dụng (ngày)', p.shelfLifeDays], ['Trạng thái', p.status],
  ] : [];
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Quay lại" hitSlop={12}>
          <ArrowLeft size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Chi tiết sản phẩm</Text>
      </View>
      {!canView ? <View style={styles.pad}><AlertBanner title="Bạn chưa được cấp quyền xem sản phẩm." /></View>
        : query.isPending ? <LoadingState message="Đang tải…" />
          : query.isError || !p ? <ErrorState error={query.error} onRetry={() => void query.refetch()} />
            : (
              <ScrollView contentContainerStyle={styles.pad}>
                {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={styles.image} contentFit="contain" /> : null}
                <Text style={[styles.name, { color: theme.text }]}>{p.productName}</Text>
                {p.description ? <Text style={{ color: theme.textSecondary }}>{p.description}</Text> : null}
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {rows.filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                    <View key={k} style={styles.line}>
                      <Text style={{ color: theme.textSecondary }}>{k}</Text>
                      <Text style={{ color: theme.text, fontFamily: FontFamily.medium, flexShrink: 1, textAlign: 'right' }}>{String(v)}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontFamily: FontFamily.bold },
  pad: { padding: 16, gap: 12 },
  image: { width: '100%', height: 200, borderRadius: 8 },
  name: { fontSize: 20, fontFamily: FontFamily.bold },
  card: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 10 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
