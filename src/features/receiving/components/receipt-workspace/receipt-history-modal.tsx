import { useCallback } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { EvidenceLinks } from '@/components/ui/evidence-preview';
import type { EvidenceFile } from '@/hooks/use-evidence-preview';
import { FontFamily, Radius } from '@/constants/theme';
import { taskDate } from '@/features/my-tasks/my-tasks';
import { useTheme } from '@/hooks/use-theme';

import type { Receipt } from '../../receiving.schema';
import { receiptHistoryTransition } from '../../receiving';

interface ReceiptHistoryModalProps { readonly visible: boolean; readonly receipt?: Receipt; readonly onClose: () => void; readonly onOpenEvidence: (file: EvidenceFile) => void }
const ACTIONS: Readonly<Record<string, string>> = {
  Create: 'Lập phiếu nhận', Update: 'Sửa phiếu nháp', ConfirmPhysicalArrival: 'Xác nhận thực nhận vào tồn chờ kiểm',
  ApproveInspection: 'Duyệt phân loại kiểm hàng', SelfApproveInspection: 'Tự duyệt phân loại kiểm hàng',
  ReturnInspectionForCorrection: 'Trả kết quả kiểm hàng để sửa', ResubmitInspection: 'Gửi lại kết quả kiểm hàng',
  CorrectInspectionClassification: 'Sửa phân loại kiểm hàng', PutAway: 'Cất hàng',
  ConfirmAcceptedReceipt: 'Xác nhận phần chấp nhận và từ chối trước nhận', IsolateReceiptDamage: 'Xác nhận cách biệt hàng hỏng',
  ReconcileLegacyReceiptStock: 'Đối soát tồn thực nhận có bằng chứng', SelfApproveLegacyReceiptStock: 'Tự duyệt đối soát tồn thực nhận',
  AssignPutAwayTask: 'Giao việc cất hàng', ReassignPutAwayTask: 'Giao lại việc cất hàng', CreatePutAwayTask: 'Mở việc cất hàng',
  StartWarehouseTask: 'Bắt đầu công việc', PauseWarehouseTask: 'Tạm dừng công việc', ReturnWarehouseTask: 'Trả việc về quản lý',
  SavePutAwayPlan: 'Lưu kế hoạch cất hàng',
};
interface HistoryRow { key: string; title: string; detail: string; at: string; evidence?: readonly EvidenceFile[] }
export function ReceiptHistoryModal({ visible, receipt, onClose, onOpenEvidence }: ReceiptHistoryModalProps) {
  const theme = useTheme();
  const rows: HistoryRow[] = [
    ...(receipt?.history.map((event, index) => ({ key: `audit:${index}`, title: ACTIONS[event.action] ?? 'Cập nhật phiếu nhận',
      detail: [event.actorName, receiptHistoryTransition(event.fromState, event.toState), event.reason].filter(Boolean).join(' · '), at: event.createdAt })) ?? []),
    ...(receipt?.items.flatMap(item => item.putAwayDetails.map(detail => ({ key: `placement:${detail.id}`,
      title: `${item.productSKU} · ${detail.quantity} ${item.baseUnitName} → ${detail.rackCode}-${detail.slotCode}`,
      detail: `${detail.performedByName}${detail.deviationReason ? ` · ${detail.deviationReason}` : ''}`, at: detail.putAwayAt, evidence: detail.deviationEvidence }))) ?? []),
  ].sort((a,b) => b.at.localeCompare(a.at));
  const renderItem = useCallback(({ item }: { item: HistoryRow }) => <View style={[styles.card, { borderColor: theme.border }]}>
    <Text style={[styles.name, { color: theme.text }]}>{item.title}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>{item.detail}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>{taskDate(item.at)}</Text>
    <EvidenceLinks files={item.evidence ?? []} onOpen={onOpenEvidence} />
  </View>, [theme, onOpenEvidence]);
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaProvider><SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList data={rows} renderItem={renderItem} keyExtractor={item => item.key} contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.group}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Lịch sử {receipt?.receiptCode}</Text>
          <Button label="Đóng lịch sử" variant="outline" onPress={onClose} />
        </View>}
        ListEmptyComponent={<Text style={[styles.text, { color: theme.textSecondary }]}>Chưa có lịch sử được ghi nhận.</Text>} />
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  group: { gap: 12 }, card: { padding: 14, borderWidth: 1, borderRadius: Radius.lg, gap: 6 },
  title: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 32 }, name: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 22 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 } });
