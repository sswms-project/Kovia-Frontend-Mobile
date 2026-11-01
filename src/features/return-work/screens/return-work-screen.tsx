import { useWatch } from 'react-hook-form';
import { RefreshCw } from 'lucide-react-native';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { StatusPill } from '@/components/ui/status-pill';
import { WorkDetails } from '@/components/ui/work-details';
import { WorkActionBar } from '@/components/work-action-bar';
import { WorkCompletionActions } from '@/components/work-completion-actions';
import { WarehouseWorkspaceControl } from '@/components/warehouse-workspace';
import { FontFamily } from '@/constants/theme';
import { TaskReasonDialog } from '@/features/warehouse-task/components/task-reason-dialog';
import { EXECUTION_STATUS_LABEL, EXECUTION_STATUS_TONE } from '@/features/warehouse-task/warehouse-task.labels';
import { useScreenSubtitle } from '@/hooks/use-screen-exit';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error';
import { formatQuantity } from '@/lib/number-format';
import { taskDate } from '@/features/my-tasks/my-tasks';
import { CustomerReturnLine } from '../components/customer-return-line';
import { SupplierReturnLine } from '../components/supplier-return-line';
import { useReturnTask, useReturnWork } from '../hooks/use-return-work';
import { conditionSlots, matchesReturnCode, matchesReturnSlot, RETURN_CONDITIONS } from '../return-work';

interface Props { readonly supplier: boolean; readonly taskId: string }
export function ReturnWorkScreen({ supplier, taskId }: Props) {
  const state = useReturnTask(supplier, taskId); const theme = useTheme();
  const forbidden = isApiErrorResponse(state.query.error) && [401, 403, 404].includes(state.query.error.statusCode);
  if (!state.canView || !state.validId || !state.query.data || forbidden) return <View style={[styles.gate, { backgroundColor: theme.background }]}>
    <WarehouseWorkspaceControl access={state.access} />
    <AlertBanner title={!state.validId ? 'Mã công việc không hợp lệ' : !state.canView ? 'Chọn kho và kiểm tra quyền thực hiện trả hàng' : state.query.isError ? 'Chưa mở được công việc trả hàng' : 'Đang tải công việc…'}
      description={state.query.error ? getApiErrorMessage(state.query.error) : 'Cần quyền xem, thực hiện công việc cá nhân và quyền xem, xử lý phiếu trả tương ứng.'} />
    {state.canView && state.validId && <Button label="Tải lại công việc" variant="outline" onPress={() => { void state.query.refetch(); }} />}
  </View>;
  return <ReturnWorkspace key={`${state.contextKey}:${state.query.data.sourceDocumentId}`} supplier={supplier} taskId={taskId} documentId={state.query.data.sourceDocumentId}
    taskFresh={state.query.isSuccess && !state.query.isFetching} taskError={state.query.error} onReloadTask={() => { void state.query.refetch(); }} />;
}
function ReturnWorkspace({ supplier, taskId, documentId, taskFresh, taskError, onReloadTask }: Props & { readonly documentId: string; readonly taskFresh: boolean; readonly taskError: Error | null; readonly onReloadTask: () => void }) {
  const state = useReturnWork(supplier, taskId, documentId, taskFresh); const theme = useTheme();
  const data = state.data; const work = data?.work; const document = data?.document;
  useScreenSubtitle(work?.referenceCode);
  const values = useWatch({ control: state.form.control });
  const verified = document && 'code' in document ? document.items.filter((line, index) => {
    const current = values.lines?.[index];
    return current?.deliveredQuantity === 0 || (matchesReturnCode(current?.scannedSlotCode ?? '', line.sourceScanCodes ?? []) && matchesReturnCode(current?.scannedProductCode ?? '', line.productScanCodes ?? [line.sku]));
  }).length : values.items?.filter(line => line?.condition === 'Scrap' || matchesReturnSlot(line?.scannedSlotCode ?? '',
    conditionSlots(data?.options ?? null, line?.returnItemId ?? '', line?.condition ?? '').find(slot => slot.slotId === line?.restockSlotId))).length ?? 0;
  const terminal = state.completed || work?.executionStatus === 'Completed' || work?.executionStatus === 'Cancelled';
  const editing = !!work?.canComplete && !terminal;
  const canFinish = state.canEdit && verified === document?.items.length && !!verified && (!supplier || values.lines?.some(line => (line?.deliveredQuantity ?? 0) > 0));
  const rows = document ? 'code' in document ? document.items.map((line, index) => ({ kind: 'supplier' as const, line, index }))
    : document.items.map((line, index) => ({ kind: 'customer' as const, line, index })) : [];
  function reload() {
    if (state.isDirty && !terminal) Alert.alert('Tải lại nội dung phiếu?', 'Nội dung chưa xác nhận sẽ được thay bằng dữ liệu mới nhất. Bạn cần quét lại mã.', [
      { text: 'Tiếp tục nhập', style: 'cancel' }, { text: 'Tải lại', onPress: () => { void state.reload(); } },
    ]); else void state.reload();
  }
  const confirmation = state.confirmation;
  const action = confirmation?.kind === 'Manage' ? confirmation.body.action : null;
  const confirmationCopy = confirmation?.kind === 'Supplier' && document && 'code' in document
    ? confirmation.body.lines.map(line => { const item = document.items.find(item => item.id === line.itemId); return `${item?.productName}: giao ${formatQuantity(line.deliveredQuantity)} ${item?.unit ?? ''}; chưa giao ${formatQuantity((item?.quantity ?? 0) - line.deliveredQuantity)}.`; }).join('\n')
    : confirmation?.kind === 'Customer' && document && 'goodsReturnRequestCode' in document
      ? confirmation.body.items.map(line => { const item = document.items.find(item => item.id === line.returnItemId); const slot = conditionSlots(data?.options ?? null, line.returnItemId, line.condition).find(slot => slot.slotId === line.restockSlotId);
        return `${item?.productName}: ${formatQuantity(item?.quantity ?? 0)} ${item?.unitName ?? ''} · ${RETURN_CONDITIONS[line.condition]}${slot ? ` · ${slot.path}` : ''}.`; }).join('\n') : '';
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.root, { backgroundColor: theme.background }]}>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FlatList<(typeof rows)[number]> style={styles.root} data={rows} keyExtractor={row => row.line.id} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
        refreshing={state.query.isFetching} onRefresh={state.command.busy || state.command.pending ? undefined : reload}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => item.kind === 'supplier' ? <SupplierReturnLine line={item.line} index={item.index} form={state.form} editable={editing} disabled={!state.canEdit} />
          : <CustomerReturnLine line={item.line} index={item.index} form={state.form} options={data?.options ?? null} editable={editing} disabled={!state.canEdit} />}
        ListHeaderComponent={<View style={styles.header}>
          <WorkCompletionActions visible={terminal} message={state.notice || 'Công việc đã kết thúc.'} />
          {taskError && !state.completed && <><AlertBanner title="Chưa kiểm tra lại được phân công" description="Nội dung đang nhập được giữ nguyên. Tải lại phân công trước khi xác nhận." /><Button label="Tải lại phân công" variant="outline" onPress={onReloadTask} /></>}
          {state.query.isPending && <AlertBanner title="Đang tải phiếu trả hàng…" />}
          {state.query.isError && !state.completed && <AlertBanner variant="destructive" title="Chưa tải được dữ liệu mới" description={getApiErrorMessage(state.query.error)} />}
          {state.conflict && <AlertBanner title="Phiếu hoặc phân công đã thay đổi" description="Nội dung đang nhập được giữ nguyên. Tải lại và kiểm tra trước khi xác nhận." />}
          {state.command.error && <AlertBanner variant="destructive" title="Cần kiểm tra thao tác" description={state.command.error} />}
          {state.command.pending && <AlertBanner title="Chưa xác định kết quả lần gửi trước" description="Ứng dụng giữ nguyên lệnh. Kiểm tra lại đúng lượt gửi trước khi thực hiện thao tác khác." />}
          {state.command.pending && <Button label="Kiểm tra lại kết quả" loading={state.command.busy} onPress={() => { void state.confirm(true); }} />}
          {!state.command.ready && !state.command.error && <Text style={[styles.meta, { color: theme.textSecondary }]}>Đang kiểm tra thao tác lưu trên thiết bị…</Text>}
          {state.notice && !terminal && <AlertBanner title={state.notice} />}
          {work && document && <>
            <View style={styles.heading}>
              <Text style={[styles.title, styles.headingCopy, { color: theme.text }]}>{supplier && 'supplierName' in document ? document.supplierName : 'recipientName' in document ? document.recipientName || 'Hàng khách trả về kho' : 'Trả hàng'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Tải lại phiếu trả hàng" disabled={state.command.busy || state.command.pending}
                onPress={reload} style={styles.refresh}><RefreshCw size={21} color={theme.primary} /></Pressable>
            </View>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>{work.warehouseName} · {document.items.length} dòng hàng</Text>
            <View style={styles.pills}>
              {state.completed ? <StatusPill label="Đã xử lý" tone="success" /> : work.executionStatus && <StatusPill label={EXECUTION_STATUS_LABEL[work.executionStatus]} tone={EXECUTION_STATUS_TONE[work.executionStatus]} />}
              {work.priority === 'Urgent' && <StatusPill label="Khẩn" tone="danger" />}
            </View>
            <WorkDetails title="Thông tin phiếu và thao tác">
              <Text style={[styles.meta, { color: theme.textSecondary }]}>Người thực hiện: {work.assignedToName || 'Bạn'} · Hạn: {taskDate(work.dueAt)}</Text>
              <Text style={[styles.meta, { color: theme.text }]}>{document.reason}</Text>
              {'stockIssueRequestCode' in document && <Text style={[styles.meta, { color: theme.textSecondary }]}>Phiếu xuất: {document.stockIssueRequestCode}</Text>}
              {'sourceGoodsReceiptCode' in document && document.sourceGoodsReceiptCode && <Text style={[styles.meta, { color: theme.textSecondary }]}>Phiếu nhận nguồn: {document.sourceGoodsReceiptCode}</Text>}
              {document.history?.map((event, index) => <Text key={`${event.createdAt}:${index}`} style={[styles.meta, { color: theme.textSecondary }]}>{event.action} · {event.actorName || 'Hệ thống'} · {taskDate(event.createdAt)}{event.reason ? `\n${event.reason}` : ''}</Text>)}
              {work.canManage && !terminal && (work.executionStatus === 'InProgress'
                ? <Button label="Tạm dừng công việc" variant="outline" disabled={state.locked} onPress={() => state.openReason('Pause')} />
                : <Button label="Trả về quản lý" variant="outline" disabled={state.locked} onPress={() => state.openReason('Return')} />)}
            </WorkDetails>
            {!terminal && <Text style={[styles.meta, { color: theme.textSecondary }]}>{supplier ? 'Quét vị trí → mã hàng → kiểm tra SL thực giao.' : 'Kiểm tra tình trạng → chọn vị trí → quét nơi đã cất.'}</Text>}
            {editing && <Text accessibilityLiveRegion="polite" style={[styles.label, { color: theme.primary }]}>Đã kiểm tra {verified}/{document.items.length} dòng</Text>}
          </>}
          {!document && <Button label="Tải lại phiếu" variant="outline" disabled={state.command.busy || state.command.pending} onPress={reload} />}
        </View>} />
      {!terminal && work?.canManage && <WorkActionBar hint={work.executionStatus === 'InProgress' ? 'Chỉ xác nhận khi đã kiểm tra hàng thực tế.' : 'Bắt đầu công việc trước khi quét và ghi nhận hàng.'}>
        {work.executionStatus !== 'InProgress' ? <Button label={work.startedAt ? 'Tiếp tục thực hiện' : 'Bắt đầu công việc'} disabled={state.locked} onPress={() => state.manage('Start')} />
          : <Button label={supplier ? 'Kiểm tra và xác nhận đã giao' : 'Hoàn tất nhận và cất hàng'} disabled={!canFinish} onPress={() => { void state.review(); }} />}
      </WorkActionBar>}
    </KeyboardAvoidingView>
    <TaskReasonDialog visible={state.reasonAction !== null} form={state.reasonForm} title={state.reasonAction === 'Pause' ? 'Tạm dừng công việc' : 'Trả công việc về quản lý'}
      description={state.reasonAction === 'Pause' ? 'Nhập lý do để quản lý tiếp tục điều phối. Nội dung chưa xác nhận chưa được ghi nhận; khi tiếp tục cần kiểm tra và quét lại.' : 'Nhập lý do để quản lý phân công lại công việc.'} isPending={state.command.busy}
      onSubmit={value => { if (state.reasonAction) state.manage(state.reasonAction, value.reason); }} onCancel={() => state.setReasonAction(null)} />
    <ConfirmationModal visible={!!confirmation && (!state.command.pending || state.command.busy)}
      title={action === 'Start' ? 'Bắt đầu thực hiện?' : action === 'Pause' ? 'Tạm dừng công việc?' : action === 'Return' ? 'Trả công việc về quản lý?' : supplier ? 'Xác nhận hàng đã giao NCC?' : 'Hoàn tất nhận và cất hàng?'}
      description={action ? confirmation?.kind === 'Manage' ? `${confirmation.body.reason || 'Bạn nhận thực hiện nhiệm vụ này. Kiểm tra đúng kho và hàng trước khi xác nhận.'}${action === 'Pause' ? '\nNội dung chưa xác nhận chưa được ghi nhận; khi tiếp tục cần kiểm tra và quét lại.' : ''}` : ''
        : `${confirmationCopy}\n\n${supplier ? 'Số thực giao sẽ trừ tồn; phần chưa giao được giải phóng giữ chỗ. Chỉ xác nhận khi đã giao hàng thực tế.' : 'Hàng đạt được nhập lại tồn. Hàng hỏng/hết hạn bị giữ, cần cách ly. Dòng không nhập lại kho không cộng tồn. Không xác nhận khi số lượng thực tế khác phiếu.'}`}
      busy={state.command.busy} confirmDisabled={state.locked} onConfirm={() => { void state.confirm(); }} onCancel={() => state.setConfirmation(null)} />
  </SafeAreaView>;
}
function Separator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({ root: { flex: 1 }, gate: { flex: 1, gap: 16, padding: 20 }, content: { padding: 16, paddingBottom: 28, gap: 0, maxWidth: 760, width: '100%', alignSelf: 'center' },
  header: { gap: 12, paddingBottom: 16 }, heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, headingCopy: { flex: 1 }, refresh: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.semibold, fontSize: 20, lineHeight: 28 }, label: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 22 },
  meta: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 }, pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, separator: { height: 14 } });
