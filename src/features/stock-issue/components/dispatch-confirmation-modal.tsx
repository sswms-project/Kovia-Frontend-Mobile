import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { WorkActionBar } from '@/components/work-action-bar';
import { WorkScreenHeader } from '@/components/work-screen-header';
import { AlertBanner } from '@/components/ui/alert-banner';
import { FontFamily, Radius } from '@/constants/theme';
import { formatQuantity } from '@/lib/number-format';
import { getApiErrorMessage } from '@/lib/api-error';
import { useTheme } from '@/hooks/use-theme';

import type { outstandingPicks } from '../stock-issue';
import { formatStockIssueStagingLocation } from '../stock-issue';

interface Props {
  readonly visible: boolean; readonly picks: ReturnType<typeof outstandingPicks>;
  readonly busy: boolean; readonly error?: Error | null; readonly onConfirm: () => void; readonly onClose: () => void;
}
export function DispatchConfirmationModal({ visible, picks, busy, error, onConfirm, onClose }: Props) {
  const theme = useTheme();
  return <Modal visible={visible} animationType="slide" onRequestClose={busy ? undefined : onClose}>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <WorkScreenHeader modal title="Xác nhận hàng đã rời kho?" onBack={onClose} />
      <FlatList style={styles.root} data={picks} keyExtractor={pick => pick.id} contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Xác nhận hàng đã rời kho?</Text>
          <AlertBanner title="Kiểm tra toàn bộ hàng trước khi xác nhận" description="Thao tác này ghi giảm tồn kho thật và chuyển phiếu sang Đã xuất kho. Chỉ xác nhận khi toàn bộ hàng dưới đây đã thực tế rời kho." />
          {error && <AlertBanner variant="destructive" title="Chưa thể ghi nhận" description={getApiErrorMessage(error)} />}
        </View>}
        renderItem={({ item }) => <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.text, { color: theme.text }]}>{item.sku} · {item.productName}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{formatStockIssueStagingLocation(item)} · Lô {item.lotNumber ?? 'Không có'} · {formatQuantity(item.pickedQuantity / item.conversionFactor)} {item.enteredUnitName}</Text>
        </View>}
        />
        <WorkActionBar hint="Xác nhận xuất toàn bộ phần hàng đang chờ xuất của phiếu.">
          <Button label="Xác nhận hàng rời kho" loading={busy} disabled={!picks.length} onPress={onConfirm} />
          <Button label="Quay lại" variant="outline" disabled={busy} onPress={onClose} />
        </WorkActionBar>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  section: { gap: 12 }, card: { gap: 10, padding: 16, borderWidth: 1, borderRadius: Radius.lg },
  title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
