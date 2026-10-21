import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate } from '@/lib/date-format';

import { factorOf, itemRemaining, type PickRow } from '../picking';

interface PickRowCardProps {
  readonly row: PickRow;
  readonly value: string;
  readonly limit: number;
  readonly isScanned: boolean;
  readonly isCurrentSlot: boolean;
  readonly disabled: boolean;
  readonly onChange: (key: string, value: string) => void;
}

const formatQuantity = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 3 });

export const PickRowCard = memo(function PickRowCard({
  row,
  value,
  limit,
  isScanned,
  isCurrentSlot,
  disabled,
  onChange,
}: PickRowCardProps) {
  const theme = useTheme();
  const { item, location } = row;
  const factor = factorOf(item);
  const unit = item.enteredUnitName ?? '';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: isCurrentSlot ? theme.primary : theme.border },
      ]}>
      <View style={styles.header}>
        <Text style={[styles.slot, { color: theme.primary }]}>
          {location.zoneCode ? `${location.zoneCode} · ` : ''}
          {location.slotCode}
        </Text>
        {isScanned ? <StatusPill label="Đã quét" tone="success" /> : null}
      </View>
      <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
        {item.productName}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {item.sku}
        {location.lotNumber ? ` · Lô ${location.lotNumber}` : ''}
        {location.expiryDate ? ` · HSD ${formatDisplayDate(new Date(location.expiryDate))}` : ''}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        Giữ tại kệ {formatQuantity(location.reservedQuantity / factor)} {unit} · Còn phải lấy{' '}
        {formatQuantity(itemRemaining(item) / factor)} {unit}
      </Text>
      <TextField
        label={`Số lượng lấy${unit ? ` (${unit})` : ''}`}
        hint={`Tối đa ${formatQuantity(limit)}`}
        keyboardType={factor === 1 ? 'decimal-pad' : 'number-pad'}
        value={value}
        editable={!disabled}
        onChangeText={(text) => onChange(row.key, text)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: { gap: 6, padding: 14, borderWidth: 2, borderRadius: Radius.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  slot: { fontFamily: FontFamily.mono, fontSize: 15 },
  name: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 21 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
});
