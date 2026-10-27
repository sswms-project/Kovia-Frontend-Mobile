import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorState } from '@/components/ui/error-state';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useStockAlertCounts } from '../hooks/use-stock-alerts';
import type { StockAlertKind } from '../stock-alerts.types';

const META: Record<StockAlertKind, { label: string; color: string }> = {
  'below-minimum': { label: 'Dưới tối thiểu', color: '#dc2626' },
  'above-maximum': { label: 'Vượt tối đa', color: '#2563eb' },
  expiring: { label: 'Sắp hết hạn', color: '#f59e0b' },
  expired: { label: 'Đã hết hạn', color: '#7c3aed' },
};
const CHART_HEIGHT = 120;

export function StockAlertSummary({ warehouseId }: { readonly warehouseId: string | null }) {
  const theme = useTheme();
  const { canView, counts, isError, isPending, refetch } = useStockAlertCounts(warehouseId);
  if (!canView) return null;
  const max = Math.max(1, ...counts.map((c) => c.total));
  const open = () => router.push('/catalog/stock-alerts');
  return <View style={styles.section}>
    <View style={styles.head}>
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Cảnh báo tồn kho</Text>
      <Pressable accessibilityRole="button" onPress={open} hitSlop={8}>
        <Text style={[styles.link, { color: theme.primary }]}>Xem tất cả</Text>
      </Pressable>
    </View>
    {isError ? <ErrorState error={new Error('Không tải được cảnh báo tồn kho')} onRetry={refetch} /> :
      <Pressable accessibilityRole="button" accessibilityLabel="Mở cảnh báo tồn kho" onPress={open}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {counts.map(({ kind, total }) => {
          const { label, color } = META[kind];
          return <View key={kind} style={styles.col}>
            <Text style={[styles.count, { color: total > 0 ? color : theme.textSecondary }]}>
              {isPending && total === 0 ? '…' : total}
            </Text>
            <View style={styles.track}>
              <View style={[styles.bar, { backgroundColor: color, height: Math.max(4, (total / max) * CHART_HEIGHT), opacity: total > 0 ? 1 : 0.25 }]} />
            </View>
            <Text numberOfLines={2} style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
          </View>;
        })}
      </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontFamily: FontFamily.bold, fontSize: 17 },
  link: { fontFamily: FontFamily.semibold, fontSize: 14 },
  card: { flexDirection: 'row', gap: 8, padding: 16, borderWidth: 1, borderRadius: Radius.xl },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  track: { height: CHART_HEIGHT, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '60%', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  count: { fontFamily: FontFamily.bold, fontSize: 18 },
  label: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16, textAlign: 'center', minHeight: 32 },
});
