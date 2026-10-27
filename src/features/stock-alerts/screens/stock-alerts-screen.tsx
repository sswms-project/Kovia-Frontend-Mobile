import { FlashList } from '@shopify/flash-list';
import { BellRing } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SearchField } from '@/components/ui/search-field';
import { SelectionField } from '@/components/ui/selection-field';
import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate } from '@/lib/date-format';

import { useAlertWarehousesQuery, useStockAlertsQuery } from '../hooks/use-stock-alerts';
import type { ExpiryAlertRow, StockAlertKind, ThresholdAlertRow } from '../stock-alerts.types';

const KIND_OPTIONS: readonly { value: StockAlertKind; label: string }[] = [
  { value: 'below-minimum', label: 'Dưới mức tối thiểu' },
  { value: 'above-maximum', label: 'Vượt mức tối đa' },
  { value: 'expiring', label: 'Sắp hết hạn' },
  { value: 'expired', label: 'Đã hết hạn' },
];

type AlertRow = ThresholdAlertRow | ExpiryAlertRow;

function isExpiryRow(row: AlertRow): row is ExpiryAlertRow {
  return 'lotId' in row;
}

export function StockAlertsScreen() {
  const theme = useTheme();
  const [kind, setKind] = useState<StockAlertKind>('below-minimum');
  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [daysText, setDaysText] = useState('5');
  const expiringDays = Math.min(365, Math.max(1, Number.parseInt(daysText, 10) || 5));

  const query = useStockAlertsQuery({ kind, warehouseId: warehouseId || null, expiringDays, search });
  const warehousesQuery = useAlertWarehousesQuery(query.canView);
  const warehouseOptions = useMemo(() => [
    { value: '', label: 'Tất cả kho được phép' },
    ...(warehousesQuery.data ?? []).flatMap((w) => {
      const id = w.id ?? w.warehouseId;
      return id ? [{ value: id, label: w.name ?? w.warehouseName ?? id }] : [];
    }),
  ], [warehousesQuery.data]);

  const rows = useMemo<AlertRow[]>(() => query.data?.pages.flatMap((page) => page.items as AlertRow[]) ?? [], [query.data]);
  const total = query.data?.pages[0]?.totalCount ?? 0;

  function renderBody() {
    if (!query.canView) return <EmptyState icon={BellRing} title="Không có quyền" description="Tài khoản chưa được cấp quyền xem cảnh báo tồn kho." />;
    if (query.isPending) return <LoadingState message="Đang tải cảnh báo…" />;
    if (query.error && rows.length === 0) return <ErrorState error={query.error} onRetry={() => { void query.refetch(); }} />;
    return (
      <FlashList data={rows} keyExtractor={(row) => isExpiryRow(row) ? `${row.warehouseId}:${row.lotId}` : `${row.warehouseId}:${row.productId}`}
        renderItem={({ item }) => <AlertCard row={item} kind={kind} />}
        ItemSeparatorComponent={Separator} contentContainerStyle={styles.listContent}
        refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => { void query.refetch(); }}
        onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={<Text style={[styles.summary, { color: theme.textSecondary }]}>{total} cảnh báo</Text>}
        ListEmptyComponent={<EmptyState icon={BellRing} title="Không có cảnh báo" description="Không có mặt hàng nào khớp bộ lọc này." />}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={theme.primary} /> : null} />
    );
  }

  return (
    <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.control}>
        <SelectionField label="Loại cảnh báo" value={kind} options={KIND_OPTIONS} onChange={(v) => setKind(v as StockAlertKind)} />
        <SelectionField label="Kho" value={warehouseId} options={warehouseOptions} onChange={setWarehouseId} />
        {kind === 'expiring' && (
          <View style={styles.daysRow}>
            <Text style={[styles.daysLabel, { color: theme.text }]}>Hết hạn trong</Text>
            <TextInput accessibilityLabel="Số ngày sắp hết hạn" keyboardType="number-pad" maxLength={3} value={daysText}
              onChangeText={(v) => setDaysText(v.replace(/\D/g, ''))}
              style={[styles.daysInput, { color: theme.text, borderColor: theme.input, backgroundColor: theme.card }]} />
            <Text style={[styles.daysLabel, { color: theme.text }]}>ngày</Text>
          </View>
        )}
        <SearchField value={search} onChangeText={setSearch} placeholder="Tìm theo SKU hoặc tên sản phẩm" accessibilityLabel="Tìm cảnh báo" />
        {!!query.error && rows.length > 0 && <AlertBanner variant="destructive" title="Không làm mới được danh sách" />}
      </View>
      <View style={styles.body}>{renderBody()}</View>
    </SafeAreaView>
  );
}

function AlertCard({ row, kind }: { readonly row: AlertRow; readonly kind: StockAlertKind }) {
  const theme = useTheme();
  let pill: { label: string; tone: 'danger' | 'warning' };
  let detail: string;
  if (isExpiryRow(row)) {
    pill = row.daysToExpiry < 0
      ? { label: `Quá hạn ${Math.abs(row.daysToExpiry)} ngày`, tone: 'danger' }
      : { label: `Còn ${row.daysToExpiry} ngày`, tone: 'warning' };
    detail = `Lô ${row.lotNumber} · HSD ${formatDisplayDate(new Date(row.expiryDate))} · Tồn ${row.onHandQuantity} ${row.unit}`;
  } else {
    pill = kind === 'below-minimum'
      ? { label: `Thiếu ${Math.abs(row.difference)}`, tone: 'danger' }
      : { label: `Vượt ${Math.abs(row.difference)}`, tone: 'warning' };
    detail = `Tồn ${row.availableQuantity} ${row.unit} · ${kind === 'below-minimum' ? 'Tối thiểu' : 'Tối đa'} ${row.thresholdQuantity}`;
  }
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{row.productName}</Text>
        <StatusPill label={pill.label} tone={pill.tone} />
      </View>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>{row.sku} · {row.warehouseName}</Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>{detail}</Text>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12, paddingTop: 8 },
  control: { paddingHorizontal: 20, gap: 10 },
  body: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  separator: { height: 10 },
  summary: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18, paddingBottom: 8 },
  footer: { paddingVertical: 16 },
  daysRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  daysLabel: { fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 20 },
  daysInput: { width: 64, height: 40, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: 10, textAlign: 'center', fontFamily: FontFamily.semibold, fontSize: 14 },
  card: { gap: 4, padding: 12, borderWidth: 1, borderRadius: Radius.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  name: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
});
