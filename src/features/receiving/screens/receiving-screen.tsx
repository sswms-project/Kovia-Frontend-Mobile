import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { P } from '@/config/permission-codes';
import { FontFamily, MaxContentWidth } from '@/constants/theme';
import { taskDate } from '@/features/my-tasks/my-tasks';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { ConfirmationModal, LocationPicker, PutAwayEditorModal, ReceiptEditorModal, ReceiptItemCard, ReceiptHistoryModal, PutAwaySuggestionsModal, RefusalEvidencePanel } from '../components/receipt-workspace';
import { useReceiptContext } from '../hooks/use-receipt-context';
import { useReceiptEditor } from '../hooks/use-receipt-editor';
import { useReceiptExecution } from '../hooks/use-receipt-execution';
import { useReceivingLocations } from '../hooks/use-receiving-locations';
import { useRefusalEvidence } from '../hooks/use-refusal-evidence';
import type { Receipt } from '../receiving.schema';

interface ReceivingScreenProps { readonly documentId: string; readonly mode: 'receiving' | 'putaway' }
const STATUS_LABELS: Readonly<Record<string, string>> = {
  Draft: 'Nháp', PendingApproval: 'Chờ duyệt kiểm hàng', InspectionCorrectionRequired: 'Cần sửa phân loại kiểm hàng',
  Approved: 'Đã duyệt · Chờ cất/cách biệt', Completed: 'Đã hoàn tất cất/cách biệt hàng', Rejected: 'Cần xử lý lại',
};
export function ReceivingScreen({ documentId, mode }: ReceivingScreenProps) {
  const context = useReceiptContext(mode, documentId);
  const locations = useReceivingLocations(context);
  const editor = useReceiptEditor(context);
  const refusal = useRefusalEvidence(context);
  const execution = useReceiptExecution(context, locations.selected, refusal);
  const beginPlacement = execution.beginPlacement;
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [suggestionsKey, setSuggestionsKey] = useState<string | null>(null);
  const theme = useTheme();
  const receipt = context.receipt.data;
  const task = context.task.data;
  const busy = editor.mutation.isPending || execution.mutation.isPending || refusal.busy;
  const canPutAway = mode === 'putaway' && context.allowed('PutAway') && context.permission(P.GOODS_RECEIPTS_PUTAWAY) &&
    !!receipt?.items.some(item => item.remainingPutAwayQuantity > 0) &&
    receipt?.putAwayTaskExecutionStatus !== 'Cancelled' && !receipt?.putAwayTaskRequiresReconciliation;
  const renderItem = useCallback(({ item }: { item: Receipt['items'][number] }) => <ReceiptItemCard item={item}
    canPutAway={canPutAway} canIsolate={context.allowed('IsolateDamage')} busy={busy} onPutAway={beginPlacement}
    onIsolate={id => beginPlacement(id, true)} />, [canPutAway, context, busy, beginPlacement]);
  const suggestions = execution.suggestions.data?.key === context.contextKey && execution.suggestions.data.version === receipt?.version
    ? execution.suggestions.data.data : null;
  if (!context.canView) return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <View style={styles.content}>
      <AlertBanner title={!context.validId ? 'Mã công việc không hợp lệ.' : !context.access.ready ? 'Chọn kho và xác minh quyền trước khi mở công việc.' : 'Bạn không có quyền truy cập nội dung này.'}
        description={context.access.selection.notice ?? undefined} />
      <Button label="Chọn kho làm việc" onPress={() => router.navigate('/')} />
      <Button label="Kiểm tra lại quyền" variant="outline" loading={context.access.profile.isFetching} onPress={() => { void context.access.refresh(); }} />
    </View>
  </SafeAreaView>;
  const error = context.receiptId ? context.receipt.error ?? context.actions.error : context.task.error;
  const loading = context.receiptId ? context.receipt.isPending || context.actions.isPending : context.task.isPending;
  const fetching = context.receiptId ? context.receipt.isFetching || context.actions.isFetching : context.task.isFetching;
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <FlatList data={error ? [] : receipt?.items ?? []} keyExtractor={item => item.id} renderItem={renderItem}
      contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshing={fetching && !loading}
      onRefresh={busy ? undefined : () => { void context.refresh(); }}
      ListHeaderComponent={<View style={styles.group}>
        <Text style={[styles.kicker, { color: theme.primary }]}>KOVIA · {context.access.warehouse?.warehouseName}</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{mode === 'putaway' ? 'Cất hàng được giao' : 'Nhận hàng được giao'}</Text>
        <Button label="Về công việc của tôi" variant="outline" disabled={busy} onPress={() => router.navigate('/tasks')} />
        {loading && <Text style={[styles.text, { color: theme.textSecondary }]}>Đang tải chứng từ…</Text>}
        {error && <AlertBanner variant="destructive" title="Chưa tải được chứng từ" description={getApiErrorMessage(error)}>
          <Button label="Tải lại chứng từ" onPress={() => { void context.refresh(); }} loading={fetching} />
        </AlertBanner>}
        {!loading && !error && receipt && <>
          <Text style={[styles.code, { color: theme.text }]}>{receipt.receiptCode}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>Yêu cầu {receipt.inboundRequestCode} · {receipt.status === 'Completed' && receipt.receivingFlowVersion === 1 && receipt.items.every(item => item.receivedQuantity === 0)
            ? 'Đã duyệt biên bản từ chối toàn bộ' : STATUS_LABELS[receipt.status] ?? receipt.status}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>Cập nhật: {taskDate(receipt.modifiedAt ?? receipt.createdAt)}</Text>
          {receipt.arrivalConfirmedAt && !receipt.arrivalStockPostedAt && <AlertBanner title="Phiếu nhận cũ cần quản lý đối soát tồn thực nhận có bằng chứng trước khi tiếp tục." />}
          {receipt.status === 'PendingApproval' && <AlertBanner title="Hàng đã nhận đang chờ duyệt kiểm hàng. Hàng tạm giữ chưa được dùng cho xuất kho." />}
          {receipt.rejectionReason && <AlertBanner title="Yêu cầu chỉnh sửa" description={receipt.rejectionReason} />}
          {mode === 'receiving' && context.allowed('Update') && context.permission(P.GOODS_RECEIPTS_CREATE) && <Button
            label={receipt.arrivalConfirmedAt ? 'Sửa phân loại kiểm hàng' : 'Sửa phiếu nháp'} disabled={busy} variant="outline" onPress={editor.begin} />}
          {mode === 'receiving' && context.allowed('Submit') && context.permission(P.GOODS_RECEIPTS_SUBMIT) && <>
            {!receipt.arrivalConfirmedAt && receipt.items.some(item => item.receivedQuantity > 0) && <Button label={locations.selected ? `Vị trí nhận: ${locations.selected.displayPath}` : 'Chọn vị trí thực tế nhận'}
              variant="outline" disabled={busy} onPress={locations.open} />}
            {!receipt.arrivalConfirmedAt && receipt.items.some(item => item.rejectedQuantity > 0) && <RefusalEvidencePanel state={refusal} />}
            <Button label={receipt.arrivalConfirmedAt ? 'Gửi lại kết quả kiểm hàng' : 'Xác nhận chấp nhận / từ chối nhận'}
              disabled={busy || fetching} onPress={execution.beginArrival} />
          </>}
          {(canPutAway || context.allowed('IsolateDamage')) && <>
            {context.allowed('IsolateDamage') && <Button label="Chọn vị trí riêng cho hàng hỏng" variant="outline" disabled={busy} onPress={locations.openIsolation} />}
            <AlertBanner title="Chỉ cất phần hàng đủ điều kiện. Hàng hỏng tiếp tục được tạm giữ; cất hàng không tăng tổng tồn." />
            <Button label={locations.selected ? `Vị trí cất: ${locations.selected.displayPath}` : 'Chọn vị trí cất thực tế'}
              variant="outline" disabled={busy} onPress={locations.open} />
            {canPutAway && <Button label="Xem gợi ý vị trí cất" variant="outline" disabled={busy} loading={execution.suggestions.isPending}
              onPress={() => { setSuggestionsKey(context.contextKey); execution.suggestions.mutate(); }} />}
            {execution.suggestions.error && <AlertBanner title="Chưa tải được gợi ý. Bạn có thể chọn vị trí hợp lệ bằng tay."
              description={getApiErrorMessage(execution.suggestions.error)} />}
            {suggestions && <>
              <Text style={[styles.text, { color: theme.textSecondary }]}>{suggestions.summary ?? 'Gợi ý chỉ để tham khảo. Cần xác nhận vị trí thực tế.'}</Text>
              {suggestions.items.every(item => item.suggestions.length === 0) && <AlertBanner title="Chưa có vị trí gợi ý phù hợp. Hãy chọn vị trí hợp lệ khác hoặc để công việc chờ xử lý." />}
              {suggestions.aiNotice && <Text style={[styles.text, { color: theme.textSecondary }]}>{suggestions.aiNotice}</Text>}
            </>}
          </>}
          <Button label="Lịch sử phiếu và các lần cất" variant="ghost" disabled={busy} onPress={() => setHistoryKey(context.contextKey)} />
          {receipt.refusalEvidence.map(file => <Text key={file.id} style={[styles.text, { color: theme.textSecondary }]}>Bằng chứng từ chối: {file.fileName}</Text>)}
        </>}
        {!loading && !error && !receipt && task && <>
          <Text style={[styles.code, { color: theme.text }]}>{task.inboundRequestCode}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{task.sourceName ?? task.supplierName ?? 'Nguồn nhận theo yêu cầu'} · Còn {task.remainingQuantity} theo đơn vị cơ sở của từng sản phẩm</Text>
          <AlertBanner title="Kiểm trước nhận: chỉ lượng chấp nhận được ghi tồn chờ duyệt/cất. Phần từ chối vẫn có biên bản, không tăng tồn và không tự đóng lượng còn phải nhận." />
          {context.permission(P.GOODS_RECEIPTS_CREATE) && <Button label="Lập phiếu thực nhận" disabled={busy || fetching || task.remainingQuantity <= 0} onPress={editor.begin} />}
        </>}
        {!loading && !error && !receipt && !task && <AlertBanner title="Không tìm thấy công việc nhận còn hiệu lực trong kho được giao. Công việc có thể đã hoàn tất hoặc được giao lại." />}
        {execution.notice && <AlertBanner title={execution.notice} />}
      </View>}
      ListFooterComponent={!loading && !error && receipt && task && task.remainingQuantity > 0 && ['Approved', 'Completed'].includes(receipt.status) ? <Button
        label="Nhận đợt tiếp theo của yêu cầu" variant="outline" disabled={busy || fetching}
        onPress={() => { context.rememberReceipt(null); void context.task.refetch(); }} /> : null} />
    <LocationPicker state={locations} title={locations.isolation ? 'Chọn vị trí riêng cách biệt hàng hỏng' : mode === 'putaway' ? 'Chọn vị trí cất' : 'Chọn vị trí thực tế nhận hàng'} excludedId={mode === 'putaway' ? receipt?.receivingSlotId : null} />
    <ReceiptEditorModal state={editor} receipt={receipt} />
    <PutAwayEditorModal state={execution} receipt={receipt} />
    {!execution.editor && <ConfirmationModal visible={!!execution.target} title="Xác nhận kết quả nhận hàng?"
      description={receipt?.arrivalConfirmedAt ? 'Gửi lại phiên bản phân loại để người có quyền duyệt. Hàng đã nhận vẫn được tạm giữ và không được cộng thêm.'
        : 'Chỉ phần chấp nhận sau kiểm được ghi tồn. Phần từ chối đã được bên giao giữ/mang về và không ghi vào kho. Chỉ xác nhận sau khi kiểm và đối chiếu bằng chứng.'}
      busy={busy} error={execution.mutation.error} onConfirm={() => { void execution.confirm(); }} onCancel={execution.cancelConfirmation} />}
    <ReceiptHistoryModal visible={historyKey === context.contextKey} receipt={receipt} onClose={() => setHistoryKey(null)} />
    <PutAwaySuggestionsModal visible={suggestionsKey === context.contextKey} data={suggestions} receipt={receipt}
      busy={execution.suggestions.isPending} error={execution.suggestions.error} onClose={() => setSuggestionsKey(null)}
      onChoose={id => { locations.chooseSuggested(execution.suggestions.data, id); setSuggestionsKey(null); }} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, gap: 16 },
  group: { gap: 14 }, title: { fontFamily: FontFamily.bold, fontSize: 26, lineHeight: 35 }, kicker: { fontFamily: FontFamily.semibold, fontSize: 13 },
  code: { fontFamily: FontFamily.mono, fontSize: 18, lineHeight: 27 }, text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
