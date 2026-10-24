import { useCallback } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { TransferPickEditor } from '../components/transfer-pick-editor';
import { TransferPickLineCard } from '../components/transfer-pick-line-card';
import { useTransferPicking } from '../hooks/use-transfer-picking';
import type { TransferPickLine } from '../transfer-picking.schema';

export function TransferPickingScreen({ transferId, shipmentId }: { readonly transferId: string; readonly shipmentId: string }) {
  const state = useTransferPicking(transferId, shipmentId);
  const theme = useTheme();
  const busy = state.mutation.isPending;
  const sheet = state.detail.data?.sheet;
  const renderLine = useCallback(({ item }: { item: TransferPickLine }) => <TransferPickLineCard
    line={item} canPick={state.canPick} busy={busy} onPick={state.beginPick} />, [state.canPick, state.beginPick, busy]);
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <FlatList data={state.canView ? sheet?.lines ?? [] : []} keyExtractor={line => line.lineId} renderItem={renderLine}
      contentContainerStyle={styles.content} ItemSeparatorComponent={Separator} refreshing={state.detail.isFetching}
      onRefresh={busy ? undefined : () => { void state.refresh(); }} ListHeaderComponent={<View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{sheet?.transferCode ?? 'Lấy hàng điều chuyển'}</Text>
        {!state.validId && <AlertBanner variant="destructive" title="Liên kết điều chuyển không hợp lệ." />}
        {!state.canView && <AlertBanner title="Chọn kho được giao và kiểm tra quyền xem điều chuyển để mở công việc." />}
        {state.detail.isPending && state.canView && <AlertBanner title="Đang tải đợt lấy hàng…" />}
        {state.detail.error && <AlertBanner variant="destructive" title="Chưa thể tải dữ liệu mới" description={getApiErrorMessage(state.detail.error)} />}
        {sheet && state.canView && <>
          <Text style={[styles.text, { color: theme.textSecondary }]}>Đợt {sheet.shipmentNumber} · {sheet.sourceWarehouseName} → {sheet.destinationWarehouseName}</Text>
          <AlertBanner title={sheet.shipmentStatus === 'Picking' ? 'Lấy hàng theo vị trí và lô được giữ chỗ' : 'Đợt lấy hàng đã chuyển bước'}
            description={sheet.shipmentStatus === 'ReadyToDispatch' ? 'Đã lấy xong, đang chờ người có quyền xác nhận hàng thực tế rời kho. Tổng tồn chưa giảm.'
              : 'Lấy hàng không làm giảm tổng tồn. Chỉ xác nhận xuất thực tế mới chuyển hàng sang đang vận chuyển.'} />
          {state.detail.isError && <AlertBanner title="Dữ liệu cũ — đã khóa thao tác ghi"
            description={`Cập nhật lần cuối: ${new Date(state.detail.dataUpdatedAt).toLocaleString('vi-VN')}`} />}
          {!state.canPick && sheet.shipmentStatus === 'Picking' && !state.detail.isFetching && !state.detail.isError && <AlertBanner
            title="Chưa thể lấy hàng" description="Kiểm tra quyền lấy hàng, trạng thái công việc và phiên bản đợt xuất. Công việc tạm dừng cần được tiếp tục từ danh sách việc." />}
          {!sheet.lines.length && <AlertBanner title="Đợt xuất không có dòng hàng." />}
          {state.canComplete && <Button label="Hoàn tất lấy hàng, chuyển chờ xuất" disabled={busy} onPress={state.beginComplete} />}
        </>}
        {state.notice && <AlertBanner title={state.notice} />}
        <Button label="Tải lại phiếu và quyền" variant="outline" disabled={busy} onPress={() => { void state.refresh(); }} />
      </View>} />
    <Modal visible={!!state.editor} animationType="slide" onRequestClose={busy ? undefined : state.closeEditor}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>{state.editor && <TransferPickEditor
        key={`${state.contextKey}:${state.editor.line.lineId}:${state.form.getValues('inventoryStockId')}`}
        line={state.editor.line} slotCode={state.editor.slotCode} form={state.form} busy={busy} notice={state.notice}
        onReview={() => { void state.review(); }} onClose={state.closeEditor} />}
        <ConfirmationModal visible={state.target?.action === 'Pick'} title="Xác nhận số hàng đã thực tế lấy?"
          description={`${state.target?.values?.quantity ?? ''} ${state.editor?.line.baseUnitName ?? ''} từ ${state.editor?.slotCode ?? ''}. Tổng tồn của kho chưa giảm.`}
          busy={busy} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancelConfirmation} />
        <ConfirmationModal visible={state.discard} title="Bỏ thay đổi chưa lưu?" description="Dữ liệu đang nhập sẽ bị bỏ."
          busy={busy} onConfirm={state.discardChanges} onCancel={() => state.setDiscard(false)} />
      </SafeAreaView>
    </Modal>
    <ConfirmationModal visible={state.target?.action === 'Complete'} title="Đã lấy đủ hàng của đợt?"
      description="Công việc lấy hàng sẽ hoàn tất và chuyển sang chờ xác nhận xuất thực tế. Thao tác này chưa giảm tồn kho."
      busy={busy} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancelConfirmation} />
  </SafeAreaView>;
}
function Separator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { gap: 16, paddingBottom: 16 }, separator: { height: 16 }, title: { fontFamily: FontFamily.bold, fontSize: 26, lineHeight: 34 },
  text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
