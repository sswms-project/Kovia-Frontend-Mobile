import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ChevronRight, CircleCheck, MapPin, Pencil } from 'lucide-react-native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { StatusPill, type PillTone } from '@/components/ui/status-pill';
import { P } from '@/config/permission-codes';
import { FontFamily, MaxContentWidth, Radius } from '@/constants/theme';
import { taskDate } from '@/features/my-tasks/my-tasks';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';
import { useEvidencePreview } from '@/hooks/use-evidence-preview';
import { EvidenceLinks, EvidencePreview } from '@/components/ui/evidence-preview';

import { ConfirmationModal, LocationPicker, PutAwayEditorModal, PutawayAllocationModal, ReceiptEditorModal, ReceiptItemCard, ReceiptHistoryModal, RefusalEvidencePanel, DocumentEvidencePanel, ReceiptStep } from '../components/receipt-workspace';
import { usePutawayAllocation } from '../hooks/use-putaway-allocation';
import { useDocumentEvidence } from '../hooks/use-document-evidence';
import { useReceiptContext } from '../hooks/use-receipt-context';
import { useReceiptHandoff } from '../hooks/use-receipt-handoff';
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
const STATUS_TONES: Readonly<Record<string, PillTone>> = {
  Draft: 'neutral', PendingApproval: 'warning', InspectionCorrectionRequired: 'danger', Rejected: 'danger', Approved: 'primary', Completed: 'success',
};
export function ReceivingScreen({ documentId, mode }: ReceivingScreenProps) {
  const context = useReceiptContext(mode, documentId);
  const evidence = useEvidencePreview('goods-receipts');
  const locations = useReceivingLocations(context);
  const allocation = usePutawayAllocation(context, locations);
  const editor = useReceiptEditor(context);
  const refusal = useRefusalEvidence(context);
  const documents = useDocumentEvidence(context);
  const execution = useReceiptExecution(context, locations.selected, refusal, documents);
  const beginPlacement = execution.beginPlacement;
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const theme = useTheme();
  const receipt = context.receipt.data;
  const task = context.task.data;
  const busy = editor.mutation.isPending || execution.mutation.isPending || allocation.mutation.isPending || refusal.busy || documents.busy;
  const handoff = useReceiptHandoff(context, busy || !!editor.target || !!execution.editor || !!allocation.visible ||
    !!execution.target || locations.isOpen || historyKey === context.contextKey || !!evidence.preview);
  const canPutAway = mode === 'putaway' && context.allowed('PutAway') && context.permission(P.GOODS_RECEIPTS_PUTAWAY) &&
    !!receipt?.items.some(item => item.remainingPutAwayQuantity > 0) &&
    receipt?.putAwayTaskExecutionStatus !== 'Cancelled' && !receipt?.putAwayTaskRequiresReconciliation;
  const renderItem = useCallback(({ item }: { item: Receipt['items'][number] }) => <ReceiptItemCard item={item}
    canPutAway={false} canIsolate={context.allowed('IsolateDamage')} busy={busy} onPutAway={beginPlacement}
    onIsolate={id => beginPlacement(id, true)} />, [context, busy, beginPlacement]);
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
        {loading && <Text style={[styles.text, { color: theme.textSecondary }]}>Đang tải chứng từ…</Text>}
        {error && <AlertBanner variant="destructive" title="Chưa tải được chứng từ" description={getApiErrorMessage(error)}>
          <Button label="Tải lại chứng từ" onPress={() => { void context.refresh(); }} loading={fetching} />
        </AlertBanner>}
        {!loading && !error && receipt && <>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardTop}>
              <Text style={[styles.code, { color: theme.text }]} numberOfLines={1}>{receipt.receiptCode}</Text>
              {mode === 'receiving' && context.allowed('Update') && context.permission(P.GOODS_RECEIPTS_CREATE) && <Pressable accessibilityRole="button"
                accessibilityLabel={receipt.arrivalConfirmedAt ? 'Sửa phân loại kiểm hàng' : 'Sửa phiếu nháp'} accessibilityState={{ disabled: busy }}
                disabled={busy} onPress={editor.begin} style={({ pressed }) => [styles.edit, { borderColor: theme.border }, (busy || pressed) && styles.dim]}>
                <Pencil size={14} color={theme.primary} />
                <Text style={[styles.editLabel, { color: theme.primary }]}>{receipt.arrivalConfirmedAt ? 'Sửa phân loại' : 'Sửa nháp'}</Text>
              </Pressable>}
            </View>
            <View style={styles.pill}><StatusPill tone={STATUS_TONES[receipt.status] ?? 'neutral'}
              label={receipt.status === 'Completed' && receipt.receivingFlowVersion === 1 && receipt.items.every(item => item.receivedQuantity === 0)
                ? 'Đã duyệt biên bản từ chối toàn bộ' : STATUS_LABELS[receipt.status] ?? receipt.status} /></View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.meta}>
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Yêu cầu</Text>
              <Text style={[styles.metaValue, { color: theme.text }]} numberOfLines={1}>{receipt.inboundRequestCode}</Text>
            </View>
            <View style={styles.meta}>
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Cập nhật</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{taskDate(receipt.modifiedAt ?? receipt.createdAt)}</Text>
            </View>
          </View>
          {receipt.arrivalConfirmedAt && !receipt.arrivalStockPostedAt && <AlertBanner title="Phiếu nhận cũ cần quản lý đối soát tồn thực nhận có bằng chứng trước khi tiếp tục." />}
          {receipt.status === 'PendingApproval' && <AlertBanner title="Phiếu đang chờ quản lý duyệt"
            description={handoff.watching ? 'Bạn có thể ở lại màn hình này. App tự cập nhật; nếu bạn được giao cất hàng, app sẽ chuyển sang màn cất sau khi phiếu được duyệt.'
              : 'Hàng tạm giữ chưa được dùng cho xuất kho. Trạng thái sẽ cập nhật khi bạn tải lại phiếu.'} />}
          {mode === 'receiving' && receipt.status === 'Approved' && <AlertBanner title="Phiếu nhận hàng đã được duyệt"
            description={receipt.putAwayAssignedTo === context.userId ? 'Đang kiểm tra quyền và công việc cất hàng được giao cho bạn.'
              : receipt.putAwayAssignedToName ? `Công việc cất hàng được giao cho ${receipt.putAwayAssignedToName}.`
                : 'Đang chờ quản lý giao việc cất hàng. Nếu được giao cho bạn, app sẽ tự chuyển sang màn cất.'} />}
          {mode === 'putaway' && <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Tiến độ cất hàng</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>Đã cất đủ {receipt.items.filter(item => item.usableQuantity > 0 && item.remainingPutAwayQuantity === 0).length}/{receipt.items.filter(item => item.usableQuantity > 0).length} sản phẩm</Text>
            {canPutAway && <Button label="Cất hàng" disabled={busy || fetching} onPress={allocation.begin} />}
          </View>}
          {receipt.rejectionReason && <AlertBanner title="Yêu cầu chỉnh sửa" description={receipt.rejectionReason} />}
          {mode === 'receiving' && context.allowed('Submit') && context.permission(P.GOODS_RECEIPTS_SUBMIT) && (() => {
            const pending = !receipt.arrivalConfirmedAt;
            const needLocation = pending && receipt.items.some(item => item.receivedQuantity > 0);
            const needRefusal = pending && receipt.items.some(item => item.rejectedQuantity > 0);
            let step = 0;
            return <>
              {needLocation && <ReceiptStep step={++step} title="Vị trí tại khu chờ cất hàng" done={!!locations.selected}>
                <Text style={[styles.text, { color: theme.textSecondary }]}>Nơi hàng đang đặt để chờ kiểm duyệt, trước khi cất vào từng vị trí lưu trữ. Tự chọn theo gợi ý của kho; bạn có thể đổi theo thực tế.</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={locations.selected ? `Vị trí nhận: ${locations.selected.displayPath}` : 'Chọn vị trí thực tế nhận'}
                  accessibilityState={{ disabled: busy }} disabled={busy} onPress={locations.open}
                  style={({ pressed }) => [styles.picker, { borderColor: theme.border, backgroundColor: theme.backgroundElement }, (busy || pressed) && styles.dim]}>
                  <MapPin size={18} color={locations.selected ? theme.primary : theme.textSecondary} />
                  <Text style={[styles.pickerText, { color: locations.selected ? theme.text : theme.textSecondary }]} numberOfLines={2}>
                    {locations.selected?.displayPath ?? (locations.query.isFetching ? 'Đang tải điểm chờ nhận…' : 'Chạm để chọn vị trí tại khu chờ cất hàng')}</Text>
                  <ChevronRight size={18} color={theme.textSecondary} />
                </Pressable>
                {locations.query.isError && <AlertBanner title="Chưa tải được vị trí nhận hàng."
                  description={getApiErrorMessage(locations.query.error)}>
                  <Button label="Tải lại vị trí nhận" variant="outline" onPress={() => { void locations.query.refetch(); }} loading={locations.query.isFetching} />
                </AlertBanner>}
              </ReceiptStep>}
              {pending && <ReceiptStep step={++step} title="Ảnh phiếu giao hàng" done={documents.files.length > 0}
                meta={documents.files.length > 0 ? `${documents.files.length}/5` : 'Không bắt buộc'}>
                <DocumentEvidencePanel state={documents} />
              </ReceiptStep>}
              {needRefusal && <ReceiptStep step={++step} title="Hàng từ chối" done={refusal.acknowledged && refusal.files.length > 0}
                meta={`${refusal.files.length}/5 ảnh`}>
                <RefusalEvidencePanel state={refusal} />
              </ReceiptStep>}
              <Button label={pending ? 'Gửi duyệt phiếu nhận hàng' : 'Gửi lại kết quả kiểm hàng'}
                disabled={busy || fetching || (needLocation && (locations.query.isFetching || locations.query.isError))}
                renderIcon={color => <CircleCheck size={18} color={color} />} onPress={execution.beginArrival} />
            </>;
          })()}
          {context.allowed('IsolateDamage') && <>
            <Button label="Chọn vị trí riêng cho hàng hỏng" variant="outline" disabled={busy} onPress={locations.openIsolation} />
            {locations.isolation && locations.selected && <Text style={[styles.text, { color: theme.textSecondary }]}>Vị trí cách biệt: {locations.selected.displayPath}</Text>}
            <AlertBanner title="Hàng hỏng được cách biệt riêng; thao tác không làm tăng tổng tồn kho." />
          </>}
          <Button label="Lịch sử phiếu và các lần cất" variant="ghost" disabled={busy} onPress={() => setHistoryKey(context.contextKey)} />
          <EvidenceLinks files={receipt.documentEvidence} onOpen={file => { void evidence.open(file); }} />
          <EvidenceLinks files={receipt.refusalEvidence} onOpen={file => { void evidence.open(file); }} />
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>Hàng hóa thực nhận · {receipt.items.length}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>Số lượng hỏng không được đưa vào cất hàng.</Text>
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
        onPress={() => { context.rememberReceipt(null); void context.task.refetch(); }} /> : undefined} />
    {!editor.target && !allocation.visible && <LocationPicker state={locations} title={locations.isolation ? 'Chọn vị trí riêng cách biệt hàng hỏng' : mode === 'putaway' ? 'Chọn vị trí cất' : 'Vị trí tại khu chờ cất hàng'} excludedId={mode === 'putaway' ? receipt?.receivingSlotId : null} />}
    <PutawayAllocationModal state={allocation} locations={locations} receipt={receipt} suggestions={suggestions}
      suggesting={execution.suggestions.isPending} suggestionError={execution.suggestions.error} onSuggest={() => execution.suggestions.mutate()} />
    <ReceiptEditorModal state={editor} receipt={receipt} locations={locations} documents={documents} refusal={refusal}
      canSubmit={context.permission(P.GOODS_RECEIPTS_SUBMIT)} />
    <PutAwayEditorModal state={execution} receipt={receipt} />
    {!execution.editor && <ConfirmationModal visible={!!execution.target} title="Xác nhận kết quả nhận hàng?"
      description={receipt?.arrivalConfirmedAt ? 'Gửi lại phiên bản phân loại để người có quyền duyệt. Hàng đã nhận vẫn được tạm giữ và không được cộng thêm.'
        : 'Chỉ phần chấp nhận sau kiểm được ghi tồn. Phần từ chối đã được bên giao giữ/mang về và không ghi vào kho. Chỉ xác nhận sau khi kiểm và đối chiếu bằng chứng.'}
      busy={busy} error={execution.mutation.error} onConfirm={() => { void execution.confirm(); }} onCancel={execution.cancelConfirmation} />}
    <ReceiptHistoryModal visible={historyKey === context.contextKey} receipt={receipt} onClose={() => setHistoryKey(null)} onOpenEvidence={file => { void evidence.open(file); }} />
    <EvidencePreview state={evidence} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, gap: 16 },
  group: { gap: 14 }, title: { fontFamily: FontFamily.bold, fontSize: 26, lineHeight: 35 }, kicker: { fontFamily: FontFamily.semibold, fontSize: 13 },
  sectionTitle: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 26 },
  code: { flex: 1, fontFamily: FontFamily.mono, fontSize: 18, lineHeight: 27 }, text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 },
  card: { gap: 10, padding: 16, borderWidth: 1, borderRadius: Radius.xl }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderWidth: 1, borderRadius: Radius.xl },
  editLabel: { fontFamily: FontFamily.semibold, fontSize: 13, lineHeight: 18 }, dim: { opacity: 0.6 }, pill: { flexDirection: 'row' },
  divider: { height: StyleSheet.hairlineWidth }, meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  metaLabel: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 }, metaValue: { flexShrink: 1, fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 20 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, borderWidth: 1, borderRadius: Radius.md },
  pickerText: { flex: 1, fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 20 } });
