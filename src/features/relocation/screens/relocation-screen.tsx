import { useCallback } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { FontFamily } from '@/constants/theme';
import { EXECUTION_LABELS, taskDate } from '@/features/my-tasks/my-tasks';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { RelocationEditor } from '../components/relocation-editor';
import { RelocationLineCard } from '../components/relocation-line-card';
import { useRelocation } from '../hooks/use-relocation';
import type { RelocationLine, RelocationTask } from '../relocation.schema';

type Row = { kind: 'line'; line: RelocationLine } | { kind: 'execution'; execution: RelocationTask['executions'][number] };
export function RelocationScreen({ taskId }: { readonly taskId: string }) {
  const state = useRelocation(taskId);
  const theme = useTheme();
  const busy = state.mutation.isPending;
  const rows: Row[] = [...(state.task?.lines ?? []).map(line => ({ kind: 'line' as const, line })),
    ...(state.task?.executions ?? []).map(execution => ({ kind: 'execution' as const, execution }))];
  const renderRow = useCallback(({ item }: { item: Row }) => item.kind === 'line'
    ? <RelocationLineCard line={item.line} canExecute={state.canExecute} busy={busy} onOpen={state.openLine} />
    : <AlertBanner title={`Đã chuyển ${item.execution.quantity}: ${item.execution.sourceSlotCode} → ${item.execution.destinationSlotCode}`}
      description={`${taskDate(item.execution.executedAt)}${item.execution.overrideReason ? ` · ${item.execution.overrideReason}` : ''}`} />,
  [state.canExecute, state.openLine, busy]);
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <FlatList data={rows} renderItem={renderRow} keyExtractor={row => row.kind === 'line' ? row.line.id : row.execution.id}
      contentContainerStyle={styles.content} ItemSeparatorComponent={Separator} refreshing={state.detail.isFetching}
      onRefresh={busy ? undefined : () => { void state.refresh(); }} ListHeaderComponent={<View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{state.task?.taskCode ?? 'Chuyển vị trí trong kho'}</Text>
        {!state.validId && <AlertBanner title="Mã công việc không hợp lệ." />}
        {!state.canView && <AlertBanner title="Chọn kho và xác minh quyền xem công việc cá nhân." description={state.access.selection.notice ?? undefined} />}
        {state.canView && state.detail.isPending && <AlertBanner title="Đang tải công việc được giao…" />}
        {state.detail.error && state.canView && <AlertBanner title="Chưa tải được dữ liệu mới" description={getApiErrorMessage(state.detail.error)} />}
        {state.task && <>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{state.task.warehouseName} · {EXECUTION_LABELS[state.task.executionStatus]}</Text>
          <Text style={[styles.text, { color: theme.text }]}>{state.task.reason}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>Hạn xử lý: {taskDate(state.task.dueAt)}</Text>
          <AlertBanner title="Chuyển vị trí giữ nguyên tổng tồn kho" description="Ghi nhận từng phần đã chuyển. Công việc tự hoàn tất khi tất cả dòng đủ số lượng; không có bước duyệt bổ sung." />
          {state.detail.isError && <AlertBanner title="Đang xem dữ liệu cũ — đã khóa ghi" description={`Lần tải thành công: ${taskDate(new Date(state.detail.dataUpdatedAt).toISOString())}`} />}
          {state.canStart && <Button label={state.task.executionStatus === 'Paused' ? 'Tiếp tục chuyển vị trí' : 'Bắt đầu chuyển vị trí'} disabled={busy} onPress={state.start} />}
          {state.canManage && !state.canReadSource && <AlertBanner title="Chưa đủ quyền xác minh tồn nguồn" description="Cần quyền xem tồn kho, sản phẩm và đơn vị để kiểm tra đúng lô và số lượng trước khi chuyển. Bạn vẫn có thể xem công việc; liên hệ quản lý để kiểm tra phân quyền." />}
          {state.task.executionStatus === 'InProgress' && state.canExecute && <Text style={[styles.text, { color: theme.textSecondary }]}>Mở từng dòng để xem lô nguồn, chọn vị trí và nhập số thực chuyển. Lịch sử các lần chuyển nằm dưới các dòng hàng.</Text>}
          {!state.task.lines.length && <AlertBanner title="Công việc chưa có dòng hàng." />}
        </>}
        {state.notice && <AlertBanner title={state.notice} />}
        <Button label="Tải lại công việc và quyền" variant="outline" disabled={busy} onPress={() => { void state.refresh(); }} />
      </View>} />
    <Modal visible={!!state.activeEditor} animationType="slide" onRequestClose={busy ? undefined : state.closeEditor}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        {state.activeEditor && <RelocationEditor key={`${state.contextKey}:${state.activeEditor.version}:${state.activeEditor.line.id}`} state={state} />}
        <ConfirmationModal visible={state.target?.action === 'Execute'} title="Xác nhận số hàng đã thực tế chuyển?"
          description={state.target?.action === 'Execute' ? `${state.target.values.quantity} ${state.source.data?.unit.unitName ?? 'đơn vị cơ sở'} từ ${state.activeEditor?.line.sourceSlotCode ?? ''} đến ${state.target.destinationCode}. Tổng tồn của kho không đổi.` : ''}
          busy={busy} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancelConfirmation} />
        <ConfirmationModal visible={state.discard} title="Bỏ thay đổi chưa lưu?" description="Dữ liệu đang nhập chưa được ghi nhận vào công việc."
          busy={busy} onConfirm={state.discardChanges} onCancel={state.cancelDiscard} />
      </SafeAreaView>
    </Modal>
    <ConfirmationModal visible={state.target?.action === 'Start'} title="Bắt đầu công việc chuyển vị trí?" description="Bước này chỉ cập nhật trạng thái công việc; chưa thay đổi tồn kho."
      busy={busy} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancelConfirmation} />
  </SafeAreaView>;
}
function Separator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { gap: 16, paddingBottom: 16 }, separator: { height: 14 }, title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 },
  text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
