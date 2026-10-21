import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate } from '@/lib/date-format';

import type { PickSheetLine } from '../transfer-tasks.types';

interface PickLineCardProps {
  readonly line: PickSheetLine;
  readonly isEditable: boolean;
  readonly isSubmitting: boolean;
  readonly selectedStockId: string | null;
  readonly quantity: string;
  readonly scannedSlot: string | null;
  readonly scannedProduct: string | null;
  readonly onSelectSuggestion: (lineId: string, stockId: string) => void;
  readonly onQuantityChange: (lineId: string, value: string) => void;
  readonly onScan: (lineId: string) => void;
  readonly onSubmit: (lineId: string) => void;
}

const formatQuantity = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

export const PickLineCard = memo(function PickLineCard({
  line,
  isEditable,
  isSubmitting,
  selectedStockId,
  quantity,
  scannedSlot,
  scannedProduct,
  onSelectSuggestion,
  onQuantityChange,
  onScan,
  onSubmit,
}: PickLineCardProps) {
  const theme = useTheme();
  const unit = line.baseUnitName ? ` ${line.baseUnitName}` : '';
  const isDone = line.remainingQuantity <= 0;
  const canWork = isEditable && !isDone && line.status !== 'PendingManager';

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
          {line.productName}
        </Text>
        {isDone ? <StatusPill label="Đã đủ" tone="success" /> : null}
        {line.status === 'PendingManager' ? <StatusPill label="Chờ quản lý" tone="warning" /> : null}
      </View>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>{line.sku}</Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        Kế hoạch {formatQuantity(line.plannedQuantity)}
        {unit} · Đã lấy {formatQuantity(line.pickedQuantity)} · Còn {formatQuantity(line.remainingQuantity)}
      </Text>
      {line.pendingReturnQuantity > 0 ? (
        <Text style={[styles.meta, { color: theme.error }]}>
          Lấy dư {formatQuantity(line.pendingReturnQuantity)}, cần trả về vị trí trước khi hoàn tất.
        </Text>
      ) : null}

      {canWork ? (
        <>
          <Text style={[styles.section, { color: theme.text }]}>Chọn vị trí lấy</Text>
          {line.suggestions.map((suggestion) => {
            const selected = suggestion.inventoryStockId === selectedStockId;
            return (
              <Pressable
                key={suggestion.inventoryStockId}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onSelectSuggestion(line.lineId, suggestion.inventoryStockId)}
                style={[
                  styles.suggestion,
                  { borderColor: selected ? theme.primary : theme.border, backgroundColor: theme.background },
                ]}>
                <Text style={[styles.slot, { color: theme.primary }]}>
                  {suggestion.zoneCode ? `${suggestion.zoneCode} · ` : ''}
                  {suggestion.slotCode}
                </Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {suggestion.lotNumber ? `Lô ${suggestion.lotNumber}` : 'Theo số lượng'}
                  {suggestion.expiryDate ? ` · HSD ${formatDisplayDate(new Date(suggestion.expiryDate))}` : ''} · Gợi ý{' '}
                  {formatQuantity(suggestion.suggestedQuantity)}
                </Text>
              </Pressable>
            );
          })}

          <Text style={[styles.meta, { color: scannedSlot ? theme.primary : theme.textSecondary }]}>
            Vị trí đã quét: {scannedSlot ?? 'chưa quét'} · Sản phẩm: {scannedProduct ?? 'chưa quét'}
          </Text>
          <Button label="Quét vị trí và sản phẩm" variant="outline" onPress={() => onScan(line.lineId)} />
          <TextField
            label={`Số lượng lấy${unit ? ` (${line.baseUnitName})` : ''}`}
            keyboardType="decimal-pad"
            value={quantity}
            onChangeText={(value) => onQuantityChange(line.lineId, value)}
          />
          <Button label="Ghi nhận lấy hàng" loading={isSubmitting} onPress={() => onSubmit(line.lineId)} />
        </>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { gap: 8, padding: 14, borderWidth: 1, borderRadius: Radius.xl },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 21 },
  meta: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  section: { fontFamily: FontFamily.semibold, fontSize: 13, marginTop: 4 },
  suggestion: { gap: 2, padding: 10, borderWidth: 2, borderRadius: Radius.lg },
  slot: { fontFamily: FontFamily.mono, fontSize: 14 },
});
