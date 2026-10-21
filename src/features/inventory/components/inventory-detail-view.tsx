import { FlashList } from '@shopify/flash-list';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ErrorState } from '@/components/ui/error-state';
import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/date-format';

import {
  ELIGIBILITY_STATUS_LABEL,
  ELIGIBILITY_STATUS_TONE,
  QUALITY_STATUS_LABEL,
  QUALITY_STATUS_TONE,
  formatInventoryLocation,
  formatQuantity,
} from '../inventory.labels';
import type { InventoryStock, StockMovement } from '../inventory.types';
import { MovementCard } from './movement-card';

interface InventoryDetailViewProps {
  readonly stock: InventoryStock;
  readonly movements: readonly StockMovement[];
  readonly isMovementsLoading: boolean;
  readonly movementsError: unknown;
  readonly isFetchingNextPage: boolean;
  readonly isRefreshing: boolean;
  readonly onRefresh: () => void;
  readonly onEndReached: () => void;
  readonly onRetryMovements: () => void;
  /** Extra actions for this line (e.g. reporting damage), shown under the details card. */
  readonly headerExtra?: ReactNode;
}

const formatOptionalDate = (value: string | null) =>
  value ? formatDisplayDate(new Date(value)) : '—';

export function InventoryDetailView({
  stock,
  movements,
  isMovementsLoading,
  movementsError,
  isFetchingNextPage,
  isRefreshing,
  onRefresh,
  onEndReached,
  onRetryMovements,
  headerExtra,
}: InventoryDetailViewProps) {
  const theme = useTheme();
  const unit = stock.unitName ? ` ${stock.unitName}` : '';
  const rows: readonly { label: string; value: string }[] = [
    { label: 'Mã sản phẩm', value: stock.sku },
    { label: 'Kho', value: stock.warehouseName },
    { label: 'Vị trí', value: formatInventoryLocation(stock) },
    { label: 'Số lô', value: stock.lotNumber ?? '—' },
    { label: 'Ngày sản xuất', value: formatOptionalDate(stock.manufacturedDate) },
    { label: 'Hạn dùng', value: formatOptionalDate(stock.expiryDate) },
    {
      label: 'Cập nhật',
      value: stock.updatedAt ? formatDisplayDateTime(new Date(stock.updatedAt)) : '—',
    },
  ];
  const quantities: readonly { label: string; value: number; isPrimary?: boolean }[] = [
    { label: 'Khả dụng', value: stock.availableQuantity, isPrimary: true },
    { label: 'Tồn kho', value: stock.quantityOnHand },
    { label: 'Giữ chỗ', value: stock.reservedQuantity },
    { label: 'Đang giữ', value: stock.holdQuantity },
  ];

  const header = (
    <View style={styles.header}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          {stock.productName}
        </Text>
        <View style={styles.pills}>
          <StatusPill
            label={QUALITY_STATUS_LABEL[stock.qualityStatus]}
            tone={QUALITY_STATUS_TONE[stock.qualityStatus]}
          />
          <StatusPill
            label={ELIGIBILITY_STATUS_LABEL[stock.eligibilityStatus]}
            tone={ELIGIBILITY_STATUS_TONE[stock.eligibilityStatus]}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.quantityGrid}>
          {quantities.map((quantity) => (
            <View
              key={quantity.label}
              accessible
              accessibilityLabel={`${quantity.label}: ${formatQuantity(quantity.value)}${unit}`}
              style={styles.quantity}>
              <Text
                style={[
                  styles.quantityValue,
                  { color: quantity.isPrimary ? theme.primary : theme.text },
                ]}>
                {formatQuantity(quantity.value)}
              </Text>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{quantity.label}</Text>
            </View>
          ))}
        </View>
        {stock.unitName ? (
          <Text style={[styles.unit, { color: theme.textSecondary }]}>Đơn vị: {stock.unitName}</Text>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {rows.map((row) => (
          <View key={row.label} accessible style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{row.label}</Text>
            <Text style={[styles.value, { color: theme.text }]}>{row.value}</Text>
          </View>
        ))}
      </View>

      {headerExtra}

      <Text accessibilityRole="header" style={[styles.section, { color: theme.text }]}>
        Lịch sử biến động
      </Text>
    </View>
  );

  function renderEmpty() {
    if (isMovementsLoading) return <ActivityIndicator style={styles.footer} color={theme.primary} />;
    if (movementsError) return <ErrorState error={movementsError} onRetry={onRetryMovements} />;
    return (
      <Text style={[styles.empty, { color: theme.textSecondary }]}>
        Chưa có biến động nào cho dòng tồn này.
      </Text>
    );
  }

  return (
    <FlashList
      data={movements}
      keyExtractor={(movement) => movement.id}
      renderItem={({ item }) => <MovementCard movement={item} showProduct={false} />}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      ListEmptyComponent={renderEmpty()}
      contentContainerStyle={styles.content}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={theme.primary} /> : null
      }
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32 },
  header: { gap: 16, paddingBottom: 12 },
  heading: { gap: 8 },
  title: { fontFamily: FontFamily.semibold, fontSize: 22, lineHeight: 30 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  card: { gap: 14, padding: 16, borderWidth: 1, borderRadius: Radius.xl },
  quantityGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quantity: { flex: 1, gap: 2 },
  quantityValue: { fontFamily: FontFamily.mono, fontSize: 22, lineHeight: 28 },
  unit: { fontFamily: FontFamily.regular, fontSize: 12 },
  row: { gap: 2 },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    letterSpacing: 0.77,
    textTransform: 'uppercase',
  },
  value: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 22 },
  section: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 24, marginTop: 4 },
  separator: { height: 10 },
  footer: { paddingVertical: 16 },
  empty: { fontFamily: FontFamily.regular, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
});
