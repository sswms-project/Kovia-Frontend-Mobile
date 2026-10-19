import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate } from '@/lib/date-format';

import {
  ELIGIBILITY_STATUS_LABEL,
  ELIGIBILITY_STATUS_TONE,
  QUALITY_STATUS_LABEL,
  QUALITY_STATUS_TONE,
  formatInventoryLocation,
  formatQuantity,
} from '../inventory.labels';
import type { InventoryStock } from '../inventory.types';

interface InventoryCardProps {
  readonly stock: InventoryStock;
  readonly onPress: () => void;
}

export function InventoryCard({ stock, onPress }: InventoryCardProps) {
  const theme = useTheme();
  const unit = stock.unitName ? ` ${stock.unitName}` : '';
  const stats: readonly { label: string; value: number; isPrimary?: boolean }[] = [
    { label: 'Khả dụng', value: stock.availableQuantity, isPrimary: true },
    { label: 'Tồn', value: stock.quantityOnHand },
    { label: 'Giữ chỗ', value: stock.reservedQuantity },
    { label: 'Đang giữ', value: stock.holdQuantity },
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${stock.productName}, mã ${stock.sku}, khả dụng ${formatQuantity(stock.availableQuantity)}${unit}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.identity}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
          {stock.productName}
        </Text>
        <Text style={[styles.sku, { color: theme.textSecondary }]}>{stock.sku}</Text>
      </View>

      <Text style={[styles.location, { color: theme.textSecondary }]} numberOfLines={2}>
        {stock.warehouseName} · {formatInventoryLocation(stock)}
      </Text>

      {stock.lotNumber ? (
        <Text style={[styles.location, { color: theme.textSecondary }]}>
          Lô {stock.lotNumber}
          {stock.expiryDate ? ` · HSD ${formatDisplayDate(new Date(stock.expiryDate))}` : ''}
        </Text>
      ) : null}

      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text
              style={[
                stat.isPrimary ? styles.primaryValue : styles.value,
                { color: stat.isPrimary ? theme.primary : theme.text },
              ]}>
              {formatQuantity(stat.value)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {stock.qualityStatus !== 'Good' || stock.eligibilityStatus !== 'Available' ? (
        <View style={styles.pills}>
          {stock.qualityStatus !== 'Good' ? (
            <StatusPill
              label={QUALITY_STATUS_LABEL[stock.qualityStatus]}
              tone={QUALITY_STATUS_TONE[stock.qualityStatus]}
            />
          ) : null}
          {stock.eligibilityStatus !== 'Available' ? (
            <StatusPill
              label={ELIGIBILITY_STATUS_LABEL[stock.eligibilityStatus]}
              tone={ELIGIBILITY_STATUS_TONE[stock.eligibilityStatus]}
            />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 14, borderWidth: 1, borderRadius: Radius.xl },
  pressed: { opacity: 0.85 },
  identity: { gap: 2 },
  name: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 21 },
  sku: { fontFamily: FontFamily.mono, fontSize: 12 },
  location: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
  stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  stat: { flex: 1, gap: 1 },
  primaryValue: { fontFamily: FontFamily.mono, fontSize: 20, lineHeight: 26 },
  value: { fontFamily: FontFamily.mono, fontSize: 15, lineHeight: 26 },
  statLabel: { fontFamily: FontFamily.regular, fontSize: 11 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
