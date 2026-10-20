import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { Receipt } from '../../receiving.schema';

interface ReceiptItemCardProps {
  readonly item: Receipt['items'][number]; readonly canPutAway: boolean; readonly busy: boolean; readonly onPutAway: (id: string) => void;
  readonly canIsolate: boolean; readonly onIsolate: (id: string) => void;
}
export const ReceiptItemCard = memo(function ReceiptItemCard({ item, canPutAway, canIsolate, busy, onPutAway, onIsolate }: ReceiptItemCardProps) {
  const theme = useTheme();
  return <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
    <Text style={[styles.title, { color: theme.text }]}>{item.productSKU} · {item.productName}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Đã nhận: {item.receivedQuantity} {item.baseUnitName} · Từ chối trước nhận: {item.rejectedQuantity}</Text>
    {item.damagedQuantity > 0 && <Text style={[styles.text, { color: theme.textSecondary }]}>Hỏng sau nhận: {item.damagedQuantity} · Còn cần cách biệt: {item.remainingDamageIsolationQuantity}</Text>}
    <Text style={[styles.text, { color: theme.textSecondary }]}>Đã cất: {item.putAwayQuantity} · Còn được cất: {item.remainingPutAwayQuantity} {item.baseUnitName}</Text>
    {item.exceptionReason && <Text style={[styles.text, { color: theme.textSecondary }]}>{item.exceptionReason}</Text>}
    {item.lotNumber && <Text style={[styles.text, { color: theme.textSecondary }]}>Lô {item.lotNumber} · Hạn {item.expiryDate ?? 'Chưa có'}</Text>}
    {canPutAway && item.remainingPutAwayQuantity > 0 && <Button label={`Cất ${item.productSKU}`} disabled={busy} onPress={() => onPutAway(item.id)} />}
    {canIsolate && item.remainingDamageIsolationQuantity > 0 && <Button label={`Cách biệt hàng hỏng ${item.productSKU}`} variant="outline" disabled={busy} onPress={() => onIsolate(item.id)} />}
  </View>;
});
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  title: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
