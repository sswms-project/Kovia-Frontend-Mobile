import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { WorkActionBar } from '@/components/work-action-bar';
import { WorkScreenHeader } from '@/components/work-screen-header';
import { AlertBanner } from '@/components/ui/alert-banner';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { outstandingPicks } from '../stock-issue';

interface Props {
  readonly visible: boolean; readonly picks: ReturnType<typeof outstandingPicks>; readonly selected: readonly string[];
  readonly busy: boolean; readonly onToggle: (id: string) => void; readonly onReview: () => void; readonly onClose: () => void;
}
export function DispatchSelectionModal({ visible, picks, selected, busy, onToggle, onReview, onClose }: Props) {
  const theme = useTheme();
  return <Modal visible={visible} animationType="slide" onRequestClose={busy ? undefined : onClose}>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <WorkScreenHeader modal title="Chọn phần hàng thực tế xuất" onBack={onClose} />
      <FlatList style={styles.root} data={picks} keyExtractor={pick => pick.id} contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Chọn phần hàng thực tế xuất</Text>
          <AlertBanner title="Chỉ chọn các lượt hàng đã thực tế rời kho" description="Phần chưa chọn vẫn ở khu chờ xuất và được giữ cho phiếu. Mỗi lần xác nhận tối đa 500 lượt." />
        </View>}
        renderItem={({ item }) => <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.text, { color: theme.text }]}>{item.sku} · {item.productName}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{item.stagingSlotCode} · Lô {item.lotNumber ?? 'Không có'} · {item.pickedQuantity} đơn vị cơ sở</Text>
          <Button label={selected.includes(item.id) ? 'Đã chọn · Bỏ chọn lượt này' : 'Chọn lượt đã rời kho'} variant={selected.includes(item.id) ? 'primary' : 'outline'}
            disabled={busy || (!selected.includes(item.id) && selected.length >= 500)} onPress={() => onToggle(item.id)} />
        </View>}
        />
        <WorkActionBar hint="Mỗi lượt được chọn chỉ xác nhận xuất một lần.">
          <Button label={`Kiểm tra ${selected.length} lượt đã chọn`} disabled={busy || selected.length === 0} onPress={onReview} />
        </WorkActionBar>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  section: { gap: 12 }, card: { gap: 10, padding: 16, borderWidth: 1, borderRadius: Radius.lg },
  title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
