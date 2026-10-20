import { router } from 'expo-router';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { FontFamily } from '@/constants/theme';
import { P } from '@/config/permission-codes';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { CountEditor } from '../components/count-editor';
import { CountItemCard } from '../components/count-item-card';
import { canRecordCountItem } from '../cycle-count';
import { useCycleCount } from '../hooks/use-cycle-count';

const STATES: Readonly<Record<string, string>> = { Scheduled: 'Đã lên lịch', Counting: 'Đang kiểm đếm', Recount: 'Đang đếm lại', Submitted: 'Đã gửi quản lý', Completed: 'Đã hoàn tất', Cancelled: 'Đã hủy' };
export function CycleCountScreen({ documentId }: { readonly documentId: string }) {
  const state = useCycleCount(documentId); const theme = useTheme(); const document = state.detail.data;
  const busy = state.mutation.isPending || state.photoBusy;
  const canRecord = state.allowed('Record') && !!state.access.profile.data?.permissions.includes(P.CYCLE_COUNTS_RECORD);
  const error = state.detail.error ?? state.actions.error;
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <FlatList data={state.canView ? document?.items ?? [] : []} keyExtractor={item => item.id} contentContainerStyle={styles.content}
      refreshing={state.detail.isFetching || state.actions.isFetching} onRefresh={busy ? undefined : () => { void state.refresh(); }}
      ItemSeparatorComponent={Separator} renderItem={({ item }) => <CountItemCard item={item} busy={busy}
        canRecord={canRecord && !!document && canRecordCountItem(document, item)} onRecord={state.beginRecord} />}
      ListHeaderComponent={<View style={styles.header}>
        <Button label="Về công việc" variant="outline" disabled={busy} onPress={() => router.back()} />
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{document?.code || 'Kiểm kê được giao'}</Text>
        {!state.canView ? <AlertBanner title={state.validId ? 'Chọn kho được giao và kiểm tra quyền xem kiểm kê.' : 'Mã kiểm kê không hợp lệ.'} /> : <>
          {state.detail.isPending && <AlertBanner title="Đang tải phiếu kiểm kê…" />}
          {error && <AlertBanner variant="destructive" title="Chưa thể tải dữ liệu mới" description={getApiErrorMessage(error)} />}
          {document && state.detail.isError && <AlertBanner title="Đang hiển thị dữ liệu cũ"
            description={`Lần tải thành công: ${new Date(state.detail.dataUpdatedAt).toLocaleString('vi-VN')}. Tải lại trước khi thao tác.`} />}
          {state.notice && <AlertBanner title={state.notice} />}
          {document && <>
            <Text style={[styles.text, { color: theme.textSecondary }]}>{document.warehouseName} · {STATES[document.status]} · Vòng {document.recountRound}</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>Bắt đầu theo lịch: {new Date(document.scheduledDate).toLocaleString('vi-VN')}</Text>
            <AlertBanner title={document.isBlindCount && ['Scheduled', 'Counting', 'Recount'].includes(document.status) ? 'Kiểm kê mù · Tồn sổ sách được ẩn' : 'Kiểm kê thực tế'}
              description="Ghi số thực đếm tại đúng vị trí/lô. Số lượng tồn không thay đổi khi lưu/gửi/hoàn tất kiểm kê; chênh lệch phải theo phiếu điều chỉnh được duyệt riêng." />
            {state.actions.data?.denialReasonCode === 'NOT_YET_SCHEDULED' && <AlertBanner title="Chưa đến thời gian kiểm kê theo lịch." />}
            {state.actions.data?.denialReasonCode === 'SNAPSHOT_RECONCILIATION_REQUIRED' && <AlertBanner title="Phiếu cũ chưa có mốc tồn xác thực. Cần quản lý yêu cầu đếm lại." />}
            {state.actions.data?.denialReasonCode === 'TASK_PAUSED_OR_CANCELLED' && <AlertBanner title="Công việc đang tạm dừng hoặc đã hủy. Mở Công việc để tiếp tục khi đủ điều kiện." />}
            {state.allowed('Start') && <Button label="Bắt đầu kiểm kê" disabled={busy} onPress={() => state.begin('Start')} />}
            {state.allowed('Submit') && <Button label="Gửi kết quả kiểm kê" disabled={busy} onPress={() => state.begin('Submit')} />}
            {!document.items.length && <AlertBanner title="Phiếu không có dòng kiểm kê." />}
          </>}
        </>}
        <Button label="Tải lại phiếu và quyền" variant="outline" disabled={busy} onPress={() => { void state.refresh(); }} />
      </View>} />
    <Modal visible={!!state.editor} animationType="slide" onRequestClose={busy ? undefined : state.closeEditor}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>{state.editor && <CountEditor key={`${state.contextKey}:${state.editor.item.id}:${state.editor.version}`}
        item={state.editor.item} form={state.form} busy={busy} canScan={state.allowed('Scan')} notice={state.notice} files={state.files}
        onPhoto={() => { void state.addPhoto(); }} onReview={() => { void state.reviewRecord(); }} onClose={state.closeEditor} />}
        <ConfirmationModal visible={state.target?.action === 'Record'} title="Lưu số đếm thực tế?"
          description={`Tổng số đếm ${state.target?.values?.countedQuantity ?? ''}, trong đó hỏng ${state.target?.values?.countedDamagedQuantity ?? ''}. Số lượng tồn chưa thay đổi. Kết quả được giữ để quản lý rà soát.`}
          busy={busy} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancelConfirmation} />
        <ConfirmationModal visible={state.discard} title="Bỏ thay đổi chưa lưu?" description="Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang không?"
          busy={busy} onConfirm={state.discardChanges} onCancel={() => state.setDiscard(false)} />
      </SafeAreaView>
    </Modal>
    <ConfirmationModal visible={!!state.target && state.target.action !== 'Record'} title={state.target?.action === 'Start' ? 'Bắt đầu đếm và chốt mốc tồn?' : 'Gửi kết quả cho quản lý?'}
      description={state.target?.action === 'Start' ? 'Hệ thống lấy mốc tồn hiện tại trước khi bắt đầu đếm. Vui lòng thực hiện đúng phạm vi được giao.'
        : 'Mọi dòng cần được ghi đếm. Nếu tồn đã biến động sau mốc kiểm kê, hệ thống yêu cầu đối soát hoặc đếm lại. Gửi kết quả không điều chỉnh tồn.'}
      busy={busy} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancelConfirmation} />
  </SafeAreaView>;
}
function Separator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { gap: 16, paddingBottom: 16 }, separator: { height: 16 }, title: { fontFamily: FontFamily.bold, fontSize: 26, lineHeight: 34 },
  text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
