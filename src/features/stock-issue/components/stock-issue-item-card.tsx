import { memo, useState } from 'react';
import { SelectionField } from '@/components/ui/selection-field';
import { WorkDetails } from '@/components/ui/work-details';
import { StatusPill } from '@/components/ui/status-pill';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatInventoryLocation, formatQuantity } from '@/features/inventory/inventory.labels';
import { formatStockIssueStagingLocation } from '../stock-issue';

import type { StockIssueItem } from '../stock-issue.schema';

interface Props { readonly item: StockIssueItem; readonly canPick: boolean; readonly busy: boolean;
  readonly onLocate?: (item: StockIssueItem, slotId: string) => void;
  readonly onReport: (item: StockIssueItem) => void;
  readonly onPick: (item: StockIssueItem, inventoryStockId: string) => void }
export const StockIssueItemCard = memo(function StockIssueItemCard({ item, canPick, busy, onPick, onReport, onLocate }: Props) {
  const theme = useTheme();
  const issued = item.pickDetails.filter(value => value.issuedAt).reduce((sum, value) => sum + value.pickedQuantity, 0);
  const [sourceId, setSourceId] = useState('');
  const sources = item.pickLocations.filter(location => location.reservedQuantity > 0);
  const location = sources.find(source => source.inventoryStockId === sourceId) ?? sources[0];
  const quantityLabel = (quantity: number) => `${formatQuantity(quantity / item.conversionFactor)} ${item.enteredUnitName}`;
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Text style={[styles.title, { color: theme.text }]}>{item.sku} · {item.productName}</Text>
    <StatusPill label={issued >= item.quantity ? 'Đã xuất đủ' : item.pickedQuantity >= item.quantity ? 'Đã lấy đủ · chờ xuất' : 'Còn cần lấy hàng'} tone={issued >= item.quantity ? 'success' : 'neutral'} />
    <View style={styles.summary}>
      {[['Yêu cầu', item.quantity], ['Đã lấy', item.pickedQuantity], ['Còn cần lấy', Math.max(0, item.quantity - item.pickedQuantity)]].map(([label, quantity]) =>
        <View key={label} style={styles.metric}><Text style={[styles.text, { color: theme.textSecondary }]}>{label}</Text>
          <Text style={[styles.title, { color: theme.text }]}>{quantityLabel(Number(quantity))}</Text></View>)}
    </View>
    <WorkDetails title="Nguồn hàng và thao tác">
    <Text style={[styles.text, { color: theme.textSecondary }]}>Đã xuất: {quantityLabel(issued)}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Đóng gói: {item.conversionFactor} đơn vị cơ sở/{item.enteredUnitName}</Text>
    {location && <View style={styles.section}>
      <SelectionField label="Nguồn hàng được giữ cho phiếu" value={location.inventoryStockId} disabled={busy}
        options={sources.map(source => ({ value: source.inventoryStockId, label: formatInventoryLocation(source),
          description: `Lô ${source.lotNumber ?? 'không có'} · HSD ${source.expiryDate ?? 'không có'} · Giữ ${quantityLabel(source.reservedQuantity)}` }))} onChange={setSourceId} />
      <Text style={[styles.text, { color: theme.text }]}>{formatInventoryLocation(location)}</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>Lô: {location.lotNumber ?? 'Không áp dụng'} · Hạn: {location.expiryDate ?? 'Không áp dụng'} · Giữ cho phiếu: {quantityLabel(location.reservedQuantity)}</Text>
      {location.directFromReceiving && <Text style={[styles.title, { color: theme.primary }]}>Đi thẳng từ khu nhận đến khu chờ xuất</Text>}
      {location.allocationReason && <Text style={[styles.text, { color: theme.textSecondary }]}>{location.allocationReason}</Text>}
      {onLocate && <Button label="Xem nguồn lấy trên sơ đồ" variant="outline" disabled={busy}
        onPress={() => onLocate(item, location.slotId)} />}
      {canPick && location.reservedQuantity > 0 && item.pickedQuantity < item.quantity &&
        <Button label={`${location.directFromReceiving ? 'Chuyển thẳng từ' : 'Lấy hàng tại'} ${formatInventoryLocation(location)}`} variant="outline" disabled={busy} onPress={() => onPick(item, location.inventoryStockId)} />}
    </View>}
    {canPick && <Button label="Báo sự cố khi lấy hàng" variant="outline" disabled={busy} onPress={() => onReport(item)} />}
    {item.pickDetails.length > 0 && <WorkDetails title={`Lịch sử lấy / xuất (${item.pickDetails.length})`}>{item.pickDetails.map(detail => <Text key={detail.id} style={[styles.text, { color: theme.textSecondary }]}>
      {formatInventoryLocation(detail)} → {formatStockIssueStagingLocation(detail)} · {quantityLabel(detail.pickedQuantity)} · {detail.issuedAt ? 'Đã xuất thực tế' : 'Đang chờ xuất'}
    </Text>)}</WorkDetails>}
    </WorkDetails>
  </View>;
});
const styles = StyleSheet.create({ card: { padding: 16, gap: 10, borderWidth: 1, borderRadius: Radius.lg },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { flexGrow: 1, minWidth: 80, gap: 2 },
  section: { gap: 8 }, title: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
