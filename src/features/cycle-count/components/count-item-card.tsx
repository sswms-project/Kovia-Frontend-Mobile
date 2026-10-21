import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate } from '@/lib/date-format';

import {
  ITEM_STATE_LABEL,
  ITEM_STATE_TONE,
  QUALITY_LABEL,
  formatItemLocation,
  formatQuantity,
  type ItemState,
} from '../cycle-count.labels';
import type { CycleCountItem } from '../cycle-count.schema';

interface CountItemCardProps {
  readonly item: CycleCountItem;
  readonly state: ItemState;
  readonly isEditable: boolean;
  readonly isBlind: boolean;
  readonly onPress: (item: CycleCountItem) => void;
}

export const CountItemCard = memo(function CountItemCard({
  item,
  state,
  isEditable,
  isBlind,
  onPress,
}: CountItemCardProps) {
  const theme = useTheme();
  const unit = item.unitName ? ` ${item.unitName}` : '';
  // Blind counts hide the book quantity while the count is open; never read that null as zero.
  const systemText =
    item.systemQuantity != null ? formatQuantity(item.systemQuantity) : isBlind ? 'Đã ẩn' : '—';
  const difference = item.difference;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.productName}, vị trí ${formatItemLocation(item)}, ${ITEM_STATE_LABEL[state]}`}
      accessibilityState={{ disabled: !isEditable }}
      disabled={!isEditable}
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: state === 'recount' ? theme.warning : theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.header}>
        <Text style={[styles.location, { color: theme.primary }]}>{formatItemLocation(item)}</Text>
        <StatusPill label={ITEM_STATE_LABEL[state]} tone={ITEM_STATE_TONE[state]} />
      </View>

      <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
        {item.productName}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>{item.productSku}</Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {item.lotNumber ? `Lô ${item.lotNumber}` : 'Theo số lượng'}
        {item.expiryDate ? ` · HSD ${formatDisplayDate(new Date(item.expiryDate))}` : ''}
        {item.qualityStatus !== 'Good' ? ` · ${QUALITY_LABEL[item.qualityStatus] ?? item.qualityStatus}` : ''}
      </Text>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.value, { color: theme.text }]}>{systemText}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sổ sách{unit}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.value, { color: theme.primary }]}>
            {item.countedQuantity != null ? formatQuantity(item.countedQuantity) : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Đã đếm</Text>
        </View>
        {difference != null && difference !== 0 ? (
          <View style={styles.stat}>
            <Text style={[styles.value, { color: difference < 0 ? theme.error : theme.warning }]}>
              {difference > 0 ? '+' : ''}
              {formatQuantity(difference)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Chênh lệch</Text>
          </View>
        ) : null}
      </View>

      {item.countedDamagedQuantity ? (
        <Text style={[styles.meta, { color: theme.error }]}>
          Trong đó hỏng: {formatQuantity(item.countedDamagedQuantity)}
        </Text>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { gap: 6, padding: 14, borderWidth: 1, borderRadius: Radius.xl },
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  location: { fontFamily: FontFamily.mono, fontSize: 14 },
  name: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 21 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 4 },
  stat: { gap: 1 },
  value: { fontFamily: FontFamily.mono, fontSize: 18, lineHeight: 24 },
  statLabel: { fontFamily: FontFamily.regular, fontSize: 11 },
});
