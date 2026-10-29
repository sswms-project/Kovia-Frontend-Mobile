import { memo, useState } from 'react';
import { SelectionField } from '@/components/ui/selection-field';
import { WorkDetails } from '@/components/ui/work-details';
import { StatusPill } from '@/components/ui/status-pill';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Text style={[styles.title, { color: theme.text }]}>{item.sku} · {item.productName}</Text>
    <StatusPill label={issued >= item.quantity ? 'Đã xuất đủ' : item.pickedQuantity >= item.quantity ? 'Đã lấy đủ · chờ xuất' : 'Còn cần lấy hàng'} tone={issued >= item.quantity ? 'success' : 'neutral'} />
    <Text style={[styles.text, { color: theme.textSecondary }]}>Yêu cầu {item.quantity} · Đã lấy {item.pickedQuantity} · Đã xuất {issued} (đơn vị cơ sở)</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Đóng gói: {item.conversionFactor} đơn vị cơ sở/{item.enteredUnitName}</Text>
    {location && <View style={styles.section}>
      <SelectionField label="Nguồn hàng được giữ cho phiếu" value={location.inventoryStockId} disabled={busy}
        options={sources.map(source => ({ value: source.inventoryStockId, label: `${source.zoneCode} / ${source.rackCode} / ${source.slotCode}`,
          description: `Lô ${source.lotNumber ?? 'không có'} · HSD ${source.expiryDate ?? 'không có'} · Giữ ${source.reservedQuantity}` }))} onChange={setSourceId} />
      <Text style={[styles.text, { color: theme.text }]}>{location.zoneCode} / {location.rackCode} / {location.slotCode}</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>Lô: {location.lotNumber ?? 'Không áp dụng'} · Hạn: {location.expiryDate ?? 'Không áp dụng'} · Giữ cho phiếu: {location.reservedQuantity}</Text>
      {location.directFromReceiving && <Text style={[styles.title, { color: theme.primary }]}>Đi thẳng từ khu nhận đến khu chờ xuất</Text>}
      {location.allocationReason && <Text style={[styles.text, { color: theme.textSecondary }]}>{location.allocationReason}</Text>}
      {onLocate && <Button label="Xem nguồn lấy trên sơ đồ" variant="outline" disabled={busy}
        onPress={() => onLocate(item, location.slotId)} />}
      {canPick && location.reservedQuantity > 0 && item.pickedQuantity < item.quantity &&
        <Button label={`${location.directFromReceiving ? 'Chuyển thẳng từ' : 'Lấy hàng tại'} ${location.slotCode}`} variant="outline" disabled={busy} onPress={() => onPick(item, location.inventoryStockId)} />}
    </View>}
    {canPick && <Button label="Báo sự cố khi lấy hàng" variant="outline" disabled={busy} onPress={() => onReport(item)} />}
    {item.pickDetails.length > 0 && <WorkDetails title={`Lịch sử lấy / xuất (${item.pickDetails.length})`}>{item.pickDetails.map(detail => <Text key={detail.id} style={[styles.text, { color: theme.textSecondary }]}>
      {detail.slotCode} → {detail.stagingSlotCode} · {detail.pickedQuantity} · {detail.issuedAt ? 'Đã xuất thực tế' : 'Đang chờ xuất'}
    </Text>)}</WorkDetails>}
  </View>;
});
const styles = StyleSheet.create({ card: { padding: 16, gap: 10, borderWidth: 1, borderRadius: Radius.lg },
  section: { gap: 8 }, title: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
