import { formatInventoryLocation } from '@/features/inventory/inventory.labels';
import { memo, useState } from 'react';
import { SelectionField } from '@/components/ui/selection-field';
import { WorkDetails } from '@/components/ui/work-details';
import { StatusPill } from '@/components/ui/status-pill';
import { StyleSheet, Text, View } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { TransferPickLine } from '../transfer-picking.schema';

interface Props { readonly line: TransferPickLine; readonly canPick: boolean; readonly busy: boolean;
  readonly onException: (action: 'Switch' | 'Escalate' | 'Return', line: TransferPickLine) => void;
  readonly onPick: (line: TransferPickLine, inventoryStockId: string) => void }
export const TransferPickLineCard = memo(function TransferPickLineCard({ line, canPick, busy, onPick, onException }: Props) {
  const theme = useTheme();
  const [sourceId, setSourceId] = useState('');
  const sources = line.suggestions.filter(source => source.suggestedQuantity > 0 && source.reservedQuantity > 0);
  const source = sources.find(value => value.inventoryStockId === sourceId) ?? sources[0];
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Text style={[styles.heading, { color: theme.text }]}>{line.sku} · {line.productName}</Text>
    <StatusPill label={line.status === 'PendingManager' ? 'Chờ quản lý' : line.pendingReturnQuantity > 0 ? 'Cần trả hàng đã lấy' : line.remainingQuantity > 0 ? 'Còn cần lấy' : 'Đã lấy đủ'}
      tone={line.status === 'PendingManager' || line.pendingReturnQuantity > 0 ? 'warning' : line.remainingQuantity > 0 ? 'neutral' : 'success'} />
    <Text style={[styles.text, { color: theme.textSecondary }]}>Kế hoạch {line.plannedQuantity} · Đã lấy {line.pickedQuantity} · Còn {line.remainingQuantity} {line.baseUnitName}</Text>
    <WorkDetails title="Nguồn hàng và thao tác">
    {line.pendingReturnQuantity > 0 && <AlertBanner title={`Còn ${line.pendingReturnQuantity} ${line.baseUnitName} cần xác nhận trả về.`} />}
    {line.status === 'PendingManager' && <AlertBanner title="Dòng hàng đang chờ quản lý xử lý. Chưa thể tiếp tục lấy." />}
    {canPick && line.remainingQuantity > 0 && line.status !== 'PendingManager' && <>
      {!line.suggestions.some(value => value.suggestedQuantity > 0 && value.reservedQuantity > 0) && <AlertBanner
        title="Không còn vị trí có lượng giữ chỗ phù hợp." description="Chọn vị trí/lô thay thế hợp lệ hoặc báo quản lý xử lý." />}
      {source && <View style={styles.source}>
        <SelectionField label="Vị trí / lô được phân bổ" value={source.inventoryStockId} disabled={busy}
          options={sources.map(value => ({ value: value.inventoryStockId,
            label: formatInventoryLocation(value),
            description: `Lô ${value.lotNumber ?? 'không có'} · HSD ${value.expiryDate ?? 'không có'} · Giữ ${value.reservedQuantity} ${line.baseUnitName}` }))} onChange={setSourceId} />
        <Text style={[styles.text, { color: theme.text }]}>{formatInventoryLocation(source)} · Lô {source.lotNumber ?? 'không có'}</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Gợi ý {source.suggestedQuantity} · Giữ chỗ {source.reservedQuantity} {line.baseUnitName}{source.expiryDate ? ` · HSD ${source.expiryDate}` : ''}</Text>
        <Button label={`Lấy tại ${formatInventoryLocation(source)}`} variant="outline" disabled={busy} onPress={() => onPick(line, source.inventoryStockId)} />
      </View>}
    </>}
    {canPick && line.remainingQuantity > 0 && line.status !== 'PendingManager' && <>
      <Button label="Đổi vị trí hoặc lô" variant="outline" disabled={busy} onPress={() => onException('Switch', line)} />
      <Button label="Báo quản lý xử lý" variant="outline" disabled={busy} onPress={() => onException('Escalate', line)} />
    </>}
    {canPick && line.picks.some(pick => pick.pickedQuantity > pick.returnedQuantity + pick.dispatchedQuantity) &&
      <Button label="Trả hàng đã lấy về vị trí" variant="outline" disabled={busy} onPress={() => onException('Return', line)} />}
    </WorkDetails>
    {(line.picks.length > 0 || line.exceptions.length > 0) && <WorkDetails title={`Lịch sử và vướng mắc (${line.picks.length + line.exceptions.length})`}>
    {line.picks.map(pick => <Text key={pick.id} style={[styles.text, { color: theme.textSecondary }]}>
      {formatInventoryLocation(line.suggestions.find(source => source.inventoryStockId === pick.inventoryStockId) ?? { slotCode: pick.slotCode })}: đã lấy {pick.pickedQuantity}, trả {pick.returnedQuantity}, xuất {pick.dispatchedQuantity} {line.baseUnitName}
    </Text>)}
    {line.exceptions.map(exception => <Text key={exception.id} style={[styles.text, { color: theme.textSecondary }]}>
      Vướng mắc: {exception.reasonCode} · {exception.status}{exception.note ? ` · ${exception.note}` : ''}
    </Text>)}
    </WorkDetails>}
  </View>;
});
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 12 },
  source: { gap: 8 }, heading: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 24 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
