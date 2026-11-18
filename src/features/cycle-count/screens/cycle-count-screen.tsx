import { WorkCompletionActions } from '@/components/work-completion-actions';
import { useExitProtection, useModalExit, useScreenSubtitle } from '@/hooks/use-screen-exit';
import { useState } from 'react';
import { WorkActionBar } from '@/components/work-action-bar';
import { WorkListTools, matchesWorkLine, type WorkFilter } from '@/components/work-list-tools';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { FontFamily } from '@/constants/theme';
import { P } from '@/config/permission-codes';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';
import { useEvidencePreview } from '@/hooks/use-evidence-preview';
import { EvidencePreview } from '@/components/ui/evidence-preview';
import { WarehouseWorkspaceControl } from '@/components/warehouse-workspace';

import { CountEditor } from '../components/count-editor';
import { CountItemCard } from '../components/count-item-card';
import { CountLineLocator } from '../components/count-line-locator';
import { CycleCountHeader } from '../components/cycle-count-header';
import { CycleCountInfoSection } from '../components/cycle-count-info-section';
import { CycleCountModeNotice } from '../components/cycle-count-mode-notice';
import { CycleCountUrgentBanner } from '../components/cycle-count-urgent-banner';
import { canRecordCountItem } from '../cycle-count';
import { formatCountDate } from '../cycle-count.labels';
import { useCycleCount } from '../hooks/use-cycle-count';

export function CycleCountScreen({ documentId }: { readonly documentId: string }) {
  const state = useCycleCount(documentId); const theme = useTheme(); const document = state.detail.data;
  useScreenSubtitle(state.canView ? document?.code : undefined);
  const closeEditor = useModalExit(state.closeEditor);
  const evidence = useEvidencePreview('cycle-count');
  const busy = state.mutation.isPending || state.photoBusy;
  useExitProtection(() => ({ busy: busy }));
  const canRecord = state.allowed('Record') && !!state.access.profile.data?.permissions.includes(P.CYCLE_COUNTS_RECORD);
  const error = state.detail.error ?? state.actions.error;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<WorkFilter>('all');
  const items = state.canView ? document?.items ?? [] : [];
  const visible = items.filter(item => matchesWorkLine(search, item.countedQuantity === null, filter,
    [item.productSku, item.productName, item.slotCode, item.rackCode, item.lotNumber]));
  const remaining = items.filter(item => item.countedQuantity === null).length;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.root, { backgroundColor: theme.background }]}>
    <FlatList style={styles.root} data={visible} keyExtractor={item => item.id} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      refreshing={state.detail.isFetching || state.actions.isFetching} onRefresh={busy ? undefined : () => { void state.refresh(); }}
      ItemSeparatorComponent={Separator} renderItem={({ item }) => <CountItemCard item={item} busy={busy} recountRound={document?.recountRound ?? 0}
        canRecord={canRecord && !!document && canRecordCountItem(document, item)} onRecord={state.beginRecord} onOpenEvidence={file => { void evidence.open(file); }} />}
      ListHeaderComponent={<View style={styles.header}>
        <WorkCompletionActions visible={!busy && !state.detail.isFetching && !state.detail.isError && !!document && ['Completed', 'Submitted'].includes(document.status)} message={document?.status === 'Submitted' ? 'Đã gửi kết quả kiểm kê.' : 'Đã hoàn tất kiểm kê.'} />
        {!state.access.ready && <WarehouseWorkspaceControl access={state.access} />}
        {!state.canView ? <AlertBanner title={state.validId ? 'Chọn kho được giao và kiểm tra quyền xem kiểm kê.' : 'Mã kiểm kê không hợp lệ.'} /> : <>
          {document && <>
            <CycleCountHeader document={document} />
            <CycleCountUrgentBanner document={document} canStart={state.allowed('Start')} />
            {document.status === 'Cancelled' && <AlertBanner variant="destructive" title="Phiếu đã bị huỷ"
              description={`Phiếu đã bị huỷ${document.cancelledAt ? ` lúc ${formatCountDate(document.cancelledAt)}` : ''}${document.cancelledByName ? ` bởi ${document.cancelledByName}` : ''}. Lý do: ${document.cancelReason ?? '—'}`} />}
            <CycleCountInfoSection document={document} />
          </>}
          {state.detail.isPending && <AlertBanner title="Đang tải phiếu kiểm kê…" />}
          {error && <AlertBanner variant="destructive" title="Chưa thể tải dữ liệu mới" description={getApiErrorMessage(error)} />}
          {document && state.detail.isError && <AlertBanner title="Đang hiển thị dữ liệu cũ"
            description={`Lần tải thành công: ${formatCountDate(new Date(state.detail.dataUpdatedAt).toISOString())}. Tải lại trước khi thao tác.`} />}
          {state.notice && <AlertBanner title={state.notice} />}
          {document && <>
            <CycleCountModeNotice document={document} />
            {state.actions.data?.denialReasonCode === 'NOT_YET_SCHEDULED' && <AlertBanner title="Chưa đến thời gian kiểm kê theo lịch." />}
            {state.actions.data?.denialReasonCode === 'SNAPSHOT_RECONCILIATION_REQUIRED' && <AlertBanner title="Phiếu cũ chưa có mốc tồn xác thực. Cần quản lý yêu cầu đếm lại." />}
            {state.actions.data?.denialReasonCode === 'TASK_PAUSED_OR_CANCELLED' && <AlertBanner title="Công việc đang tạm dừng hoặc đã hủy. Mở Công việc để tiếp tục khi đủ điều kiện." />}
            <Text accessibilityRole="header" style={[styles.section, { color: theme.text }]}>Dòng kiểm kê</Text>
            <WorkListTools search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} shown={visible.length} total={items.length} disabled={busy} />
            {state.actions.data?.allowedActions.includes('Scan') && <CountLineLocator key={`${state.contextKey}:${document.recountRound}`}
              document={document} disabled={busy || !canRecord || !state.allowed('Scan')} onRecord={state.beginRecord} />}
            {!document.items.length && <AlertBanner title="Phiếu không có dòng kiểm kê." />}
          </>}
        </>}
      </View>} ListEmptyComponent={items.length > 0 ? <Text style={[styles.text, { color: theme.textSecondary }]}>Không có dòng kiểm kê phù hợp.</Text> : undefined} />
    {(state.allowed('Start') || state.allowed('Submit')) && <WorkActionBar hint={`Còn ${remaining} dòng chưa ghi đếm. Gửi kết quả không điều chỉnh tồn kho.`}>
      {state.allowed('Start') && <Button label="Bắt đầu kiểm kê" disabled={busy} onPress={() => state.begin('Start')} />}
      {state.allowed('Submit') && <Button label="Gửi kết quả kiểm kê" disabled={busy} onPress={() => state.begin('Submit')} />}
    </WorkActionBar>}
    <Modal visible={!!state.editor} animationType="slide" onRequestClose={busy ? undefined : closeEditor}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>{state.editor && <CountEditor key={`${state.contextKey}:${state.editor.item.id}:${state.editor.version}`}
        item={state.editor.item} form={state.form} busy={busy} canScan={state.allowed('Scan')} notice={state.notice} files={state.files}
        submitDisabled={!state.allowed('Record')} onRemovePhoto={state.removePhoto}
        onPhoto={(source) => { void state.addPhoto(source); }} onReview={() => { void state.reviewRecord(); }} onClose={state.closeEditor} />}
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
    <EvidencePreview state={evidence} />
  </SafeAreaView>;
}
function Separator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { gap: 16, paddingBottom: 16 }, separator: { height: 16 },
  section: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 22 },
  text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
