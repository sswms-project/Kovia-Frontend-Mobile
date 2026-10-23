import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { transferReceivingDate } from '../transfer-receiving';
import type { TransferPutAwayEvent, TransferPutAwayRow } from '../transfer-receiving.schema';

export const TransferPutAwayCard = memo(function TransferPutAwayCard({ row }: { readonly row: TransferPutAwayRow }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Text style={[styles.heading, { color: theme.text }]}>{row.sku} · {row.productName}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Lô: {row.lotNumber ?? 'Không có'}</Text>
    <Text style={[styles.text, { color: theme.text }]}>Thực nhận tốt {row.actualQuantity} · Đã cất {row.putAwayQuantity} · Còn chờ cất {row.remainingQuantity} {row.baseUnitName}</Text>
    {row.keptAtReceivingQuantity > 0 && <Text style={[styles.text, { color: theme.textSecondary }]}>Giữ tại vị trí nhận: {row.keptAtReceivingQuantity} {row.baseUnitName}. Phần này chưa cất vào kệ.</Text>}
    {row.planMode === 'Planned' && <Text style={[styles.text, { color: theme.textSecondary }]}>Ngân sách vị trí dùng chung cho các lô cùng dòng hàng; không cộng lặp giữa các lô.</Text>}
    {row.planBudgets.length ? row.planBudgets.map(budget => <Text key={budget.slotId} style={[styles.text, { color: theme.text }]}>
      {budget.path} · Còn kế hoạch {budget.remainingBudget} {row.baseUnitName}
    </Text>) : <Text style={[styles.text, { color: theme.textSecondary }]}>Không có vị trí kế hoạch khả dụng trong phiếu hiện tại.</Text>}
  </View>;
});
export const TransferPutAwayHistoryCard = memo(function TransferPutAwayHistoryCard({ event, sku, unit }: {
  readonly event: TransferPutAwayEvent; readonly sku: string; readonly unit: string;
}) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Text style={[styles.heading, { color: theme.text }]}>{sku} · {event.quantity} {unit}</Text>
    <Text style={[styles.text, { color: theme.text }]}>{event.path}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>{transferReceivingDate(event.putAwayAt)}{event.isLateReceipt ? ' · Hàng nhận bổ sung' : ''}</Text>
    {event.isOffPlan && <Text style={[styles.text, { color: theme.textSecondary }]}>Vị trí cất khác kế hoạch</Text>}
    {event.slotCodeUnreadable && <Text style={[styles.text, { color: theme.textSecondary }]}>Đã ghi nhận không đọc được nhãn vị trí</Text>}
    {event.deviationReasonCode && <Text style={[styles.text, { color: theme.textSecondary }]}>Lý do: {event.deviationReasonCode}</Text>}
    {event.note && <Text style={[styles.text, { color: theme.text }]}>{event.note}</Text>}
  </View>;
});
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  heading: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 24 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
