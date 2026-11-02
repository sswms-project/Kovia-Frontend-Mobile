import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { AlertBanner } from '@/components/ui/alert-banner';
import { WorkDetails } from '@/components/ui/work-details';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatQuantity } from '@/lib/number-format';

import type { Receipt } from '../../receiving.schema';

interface ReceiptItemCardProps {
  readonly item: Receipt['items'][number]; readonly canPutAway: boolean; readonly busy: boolean; readonly onPutAway: (id: string) => void;
  readonly canIsolate: boolean; readonly onIsolate: (id: string) => void;
}
export const ReceiptItemCard = memo(function ReceiptItemCard({ item, canPutAway, canIsolate, busy, onPutAway, onIsolate }: ReceiptItemCardProps) {
  const theme = useTheme();
  const quantityWithUnit = (quantity: number) => `${formatQuantity(quantity, 6)}\u00a0${item.baseUnitName}`;
  const placements = item.putAwayDetails.map(detail =>
    `${detail.isSystemDefaultSlot ? `Kệ ${detail.rackCode}` : detail.slotCode} · ${quantityWithUnit(detail.quantity)}`);
  return <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
    <View>
      <Text style={[styles.title, { color: theme.text }]}>{item.productName}</Text>
      <Text style={[styles.sku, { color: theme.textSecondary }]}>{item.productSKU}</Text>
    </View>
    <View style={styles.row}>
      <ReceiptItemMetric label="Còn cần cất" value={quantityWithUnit(item.remainingPutAwayQuantity)} />
      <ReceiptItemMetric label="Đã nhận" value={quantityWithUnit(item.receivedQuantity)} />
    </View>
    {item.damagedQuantity > 0 && <Text style={[styles.text, { color: theme.error }]}>Hàng hỏng đã ghi nhận: {quantityWithUnit(item.damagedQuantity)}</Text>}
    {item.remainingDamageIsolationQuantity > 0 && <AlertBanner variant="destructive"
      title={`Cần cách biệt ${quantityWithUnit(item.remainingDamageIsolationQuantity)} hàng hỏng`} />}
    {item.rejectedQuantity > 0 && <Text style={[styles.text, { color: theme.textSecondary }]}>Từ chối trước nhận: {quantityWithUnit(item.rejectedQuantity)}</Text>}
    {item.keptAtReceivingQuantity > 0 && <Text style={[styles.text, { color: theme.textSecondary }]}>Giữ tại khu nhận: {quantityWithUnit(item.keptAtReceivingQuantity)}</Text>}
    {item.exceptionReason && <Text style={[styles.text, { color: theme.textSecondary }]}>{item.exceptionReason}</Text>}
    {item.lotNumber && <Text style={[styles.text, { color: theme.textSecondary }]}>Lô {item.lotNumber} · Hạn {item.expiryDate ?? 'Chưa có'}</Text>}
    <WorkDetails title="Vị trí đã cất và quy đổi">
      <Text style={[styles.text, { color: theme.textSecondary }]}>Theo yêu cầu: {quantityWithUnit(item.orderedQuantity)} · Từ chối trước nhận: {quantityWithUnit(item.rejectedQuantity)}</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>Vị trí cất: {placements.length ? placements.join('; ') : 'Chưa cất hàng'}</Text>
      {item.enteredUnitId && item.enteredUnitId !== item.baseUnitId && item.enteredUnitName &&
        <Text style={[styles.text, { color: theme.textSecondary }]}>1 {item.enteredUnitName} = {quantityWithUnit(item.conversionFactorSnapshot)}</Text>}
    </WorkDetails>
    {canPutAway && item.remainingPutAwayQuantity > 0 && <Button label={`Cất ${item.productSKU}`} disabled={busy} onPress={() => onPutAway(item.id)} />}
    {canIsolate && item.remainingDamageIsolationQuantity > 0 && <Button label={`Cách biệt hàng hỏng ${item.productSKU}`} variant="outline" disabled={busy} onPress={() => onIsolate(item.id)} />}
  </View>;
});
function ReceiptItemMetric({ label, value }: { readonly label: string; readonly value: string }) {
  const theme = useTheme();
  return <View style={styles.metric}>
    <Text style={[styles.text, { color: theme.textSecondary }]}>{label}</Text>
    <Text style={[styles.quantity, { color: theme.text }]}>{value}</Text>
  </View>;
}
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  title: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 },
  sku: { fontFamily: FontFamily.mono, fontSize: 12, lineHeight: 18 },
  quantity: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 27 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, metric: { flexBasis: 110, flexGrow: 1, minWidth: 0 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
