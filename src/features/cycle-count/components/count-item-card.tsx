import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EvidenceLinks } from '@/components/ui/evidence-preview';
import type { EvidenceFile } from '@/hooks/use-evidence-preview';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { CountItem } from '../cycle-count.schema';

interface Props { readonly item: CountItem; readonly canRecord: boolean; readonly busy: boolean; readonly onRecord: (item: CountItem) => void; readonly onOpenEvidence: (file: EvidenceFile) => void }
export const CountItemCard = memo(function CountItemCard({ item, canRecord, busy, onRecord, onOpenEvidence }: Props) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Text style={[styles.title, { color: theme.text }]}>{item.productSku} · {item.productName}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>{item.rackCode ?? ''} / {item.slotCode} · {item.unitName ?? 'Đơn vị cơ sở'}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Lô: {item.lotNumber ?? 'Không áp dụng'} · Hạn: {item.expiryDate ?? 'Không áp dụng'}</Text>
    <Text style={[styles.text, { color: theme.text }]}>{item.countedQuantity === null ? 'Chưa ghi nhận số đếm' : `Đã đếm: ${item.countedQuantity} · Hỏng trong số đếm: ${item.countedDamagedQuantity ?? 0}`}</Text>
    {item.systemQuantity !== null && <Text style={[styles.text, { color: theme.textSecondary }]}>Tồn tại mốc kiểm kê: {item.systemQuantity} · Chênh lệch: {item.difference ?? 'Chưa xác định'}</Text>}
    {item.countedByName && <Text style={[styles.text, { color: theme.textSecondary }]}>{item.countedByName} · {item.countedAt ? new Date(item.countedAt).toLocaleString('vi-VN') : ''}</Text>}
    {item.damageReason && <Text style={[styles.text, { color: theme.textSecondary }]}>Ghi nhận hỏng: {item.damageReason}</Text>}
    <EvidenceLinks files={item.damageEvidence ?? []} onOpen={onOpenEvidence} />
    {item.countHistory.map(history => <View key={history.id} style={styles.history}>
      <Text style={[styles.text, { color: theme.text }]}>Lần đếm trước vòng {history.recountRound}: {history.countedQuantity} · {history.countedByName ?? 'Nhân viên kiểm đếm'}</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>Yêu cầu đếm lại: {history.recountReason}</Text>
    </View>)}
    {canRecord && <Button label={`Ghi đếm ${item.productSku} tại ${item.slotCode}`} variant="outline" disabled={busy} onPress={() => onRecord(item)} />}
    {item.countedQuantity !== null && <Text style={[styles.text, { color: theme.textSecondary }]}>Nếu cần sửa số đếm, liên hệ quản lý yêu cầu đếm lại để giữ lịch sử.</Text>}
  </View>;
});
const styles = StyleSheet.create({ card: { padding: 16, gap: 10, borderWidth: 1, borderRadius: Radius.lg }, history: { gap: 4, paddingTop: 8 },
  title: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
