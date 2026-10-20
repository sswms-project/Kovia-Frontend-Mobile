import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { TransferPickLine } from '../transfer-picking.schema';

interface Props { readonly line: TransferPickLine; readonly canPick: boolean; readonly busy: boolean;
  readonly onPick: (line: TransferPickLine, inventoryStockId: string) => void }
export const TransferPickLineCard = memo(function TransferPickLineCard({ line, canPick, busy, onPick }: Props) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Text style={[styles.heading, { color: theme.text }]}>{line.sku} · {line.productName}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Kế hoạch {line.plannedQuantity} · Đã lấy {line.pickedQuantity} · Còn {line.remainingQuantity} {line.baseUnitName}</Text>
    {line.pendingReturnQuantity > 0 && <AlertBanner title={`Còn ${line.pendingReturnQuantity} ${line.baseUnitName} cần xác nhận trả về.`} />}
    {line.status === 'PendingManager' && <AlertBanner title="Dòng hàng đang chờ quản lý xử lý. Chưa thể tiếp tục lấy." />}
    {canPick && line.remainingQuantity > 0 && line.status !== 'PendingManager' && <>
      {!line.suggestions.some(value => value.suggestedQuantity > 0 && value.reservedQuantity > 0) && <AlertBanner
        title="Không còn vị trí có lượng giữ chỗ phù hợp." description="Liên hệ quản lý để đổi vị trí hoặc xử lý chênh lệch trên web trước khi tiếp tục." />}
      {line.suggestions.filter(value => value.suggestedQuantity > 0 && value.reservedQuantity > 0).map(source => <View key={source.inventoryStockId} style={styles.source}>
        <Text style={[styles.text, { color: theme.text }]}>{[source.zoneCode, source.rackCode, source.slotCode].filter(Boolean).join(' / ')} · Lô {source.lotNumber ?? 'không có'}</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Gợi ý {source.suggestedQuantity} · Giữ chỗ {source.reservedQuantity} {line.baseUnitName}{source.expiryDate ? ` · HSD ${source.expiryDate}` : ''}</Text>
        <Button label={`Lấy tại ${source.slotCode}`} variant="outline" disabled={busy} onPress={() => onPick(line, source.inventoryStockId)} />
      </View>)}
    </>}
    {line.picks.map(pick => <Text key={pick.id} style={[styles.text, { color: theme.textSecondary }]}>
      {pick.slotCode}: đã lấy {pick.pickedQuantity}, trả {pick.returnedQuantity}, xuất {pick.dispatchedQuantity} {line.baseUnitName}
    </Text>)}
    {line.exceptions.map(exception => <Text key={exception.id} style={[styles.text, { color: theme.textSecondary }]}>
      Vướng mắc: {exception.reasonCode} · {exception.status}{exception.note ? ` · ${exception.note}` : ''}
    </Text>)}
  </View>;
});
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 12 },
  source: { gap: 8 }, heading: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 24 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
