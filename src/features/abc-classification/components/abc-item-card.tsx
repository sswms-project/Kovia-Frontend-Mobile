import { StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatQuantity } from '@/lib/number-format';

import { ABC_CLASS_HINTS, ABC_CLASS_TONES } from '../abc-classification.labels';
import type { AbcItem } from '../abc-classification.types';

export function AbcItemCard({ item }: { readonly item: AbcItem }) {
  const theme = useTheme();
  return (
    <View accessible accessibilityLabel={`${item.productName}, hạng ${item.class}, ${item.cumulativePercentage.toFixed(1)} phần trăm tích lũy`}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <StatusPill label={`Hạng ${item.class} · ${ABC_CLASS_HINTS[item.class]}`} tone={ABC_CLASS_TONES[item.class]} />
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
            {item.productName}
            <Text style={[styles.sku, { color: theme.textSecondary }]}>  {item.sku}</Text>
          </Text>
        </View>
        <Text style={[styles.percent, { color: theme.text }]}>{item.cumulativePercentage.toFixed(1)}%</Text>
      </View>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        Tồn {formatQuantity(item.totalQuantity)} · Chỉ số {formatQuantity(item.metricValue)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, padding: 12, borderWidth: 1, borderRadius: Radius.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1, gap: 6 },
  name: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  sku: { fontFamily: FontFamily.mono, fontSize: 11 },
  percent: { fontFamily: FontFamily.mono, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
});
