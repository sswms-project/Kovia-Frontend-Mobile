import { useCallback } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import type { useReceiptExecution } from '../../hooks/use-receipt-execution';
import type { Receipt } from '../../receiving.schema';

type SuggestionResult = NonNullable<ReturnType<typeof useReceiptExecution>['suggestions']['data']>['data'];
interface PutAwaySuggestionsModalProps {
  readonly visible: boolean; readonly data: SuggestionResult | null; readonly receipt?: Receipt; readonly busy: boolean;
  readonly error: Error | null; readonly onClose: () => void; readonly onChoose: (id: string) => void;
}
interface SuggestionRow { key: string; sku: string; unitName: string; slot: SuggestionResult['items'][number]['suggestions'][number] }
export function PutAwaySuggestionsModal({ visible, data, receipt, busy, error, onClose, onChoose }: PutAwaySuggestionsModalProps) {
  const theme = useTheme();
  const rows: SuggestionRow[] = data?.items.flatMap(item => item.suggestions.map((slot, index) => ({ key: `${item.goodsReceiptItemId}:${slot.slotId}:${index}`,
    sku: receipt?.items.find(line => line.id === item.goodsReceiptItemId)?.productSKU ?? '',
    unitName: receipt?.items.find(line => line.id === item.goodsReceiptItemId)?.baseUnitName ?? '', slot }))) ?? [];
  const renderItem = useCallback(({ item }: { item: SuggestionRow }) => <View style={[styles.card, { borderColor: theme.border }]}>
    <Text style={[styles.name, { color: theme.text }]}>{item.sku} · {item.slot.zoneName} · {item.slot.rackCode}-{item.slot.slotCode}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Đề xuất: {item.slot.suggestedQuantity} {item.unitName} · Điểm {item.slot.score}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>{item.slot.reason}</Text>
    {!!item.slot.warnings.length && <AlertBanner title={item.slot.warnings.join(' · ')} />}
    <Button label={`Chọn vị trí ${item.slot.slotCode}`} variant="outline" disabled={busy || item.slot.slotId === receipt?.receivingSlotId} onPress={() => onChoose(item.slot.slotId)} />
  </View>, [theme, busy, receipt?.receivingSlotId, onChoose]);
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaProvider><SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList data={rows} renderItem={renderItem} keyExtractor={item => item.key} contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.group}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Gợi ý vị trí cất</Text>
          <AlertBanner title="Gợi ý chỉ để tham khảo. Chỉ chọn vị trí hàng thực tế được cất; máy chủ kiểm tra lại sức chứa khi xác nhận."
            description={data?.summary ?? undefined} />
          {data?.risks.length ? <AlertBanner title={data.risks.join(' · ')} /> : null}
          {data?.heldSlots.length ? <AlertBanner title="Một số vị trí đang chừa cho hàng sắp về. Lựa chọn khác kế hoạch có thể cần lý do." /> : null}
          {busy && <Text style={[styles.text, { color: theme.textSecondary }]}>Đang tính gợi ý…</Text>}
          {error && <AlertBanner title="Chưa thể tải gợi ý. Bạn vẫn có thể chọn vị trí hợp lệ bằng tay." description={getApiErrorMessage(error)} />}
          <Button label="Đóng gợi ý và chọn bằng tay" variant="outline" onPress={onClose} />
        </View>}
        ListEmptyComponent={!busy && !error ? <Text style={[styles.text, { color: theme.textSecondary }]}>Chưa có vị trí gợi ý phù hợp. Hãy chọn vị trí hợp lệ khác hoặc để công việc chờ xử lý.</Text> : undefined} />
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' }, group: { gap: 12 },
  card: { padding: 14, borderWidth: 1, borderRadius: Radius.lg, gap: 10 }, title: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 32 },
  name: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 22 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 } });
