import { useCallback } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

import type { useReceiptEditor } from '../../hooks/use-receipt-editor';
import type { Receipt } from '../../receiving.schema';
import { ConfirmationModal } from './confirmation-modal';
import { ReceiptLineFields, type ReceiptEditorLine } from './receipt-line-fields';
import { LocationPicker } from './location-picker';
import { DocumentEvidencePanel } from './document-evidence-panel';
import { RefusalEvidencePanel } from './refusal-evidence-panel';
import type { useReceivingLocations } from '../../hooks/use-receiving-locations';
import type { useDocumentEvidence } from '../../hooks/use-document-evidence';
import type { useRefusalEvidence } from '../../hooks/use-refusal-evidence';

interface ReceiptEditorModalProps {
  readonly state: ReturnType<typeof useReceiptEditor>; readonly receipt?: Receipt;
  readonly locations: ReturnType<typeof useReceivingLocations>;
  readonly documents: ReturnType<typeof useDocumentEvidence>;
  readonly refusal: ReturnType<typeof useRefusalEvidence>;
  readonly canSubmit: boolean;
}
export function ReceiptEditorModal({ state, receipt, locations, documents, refusal, canSubmit }: ReceiptEditorModalProps) {
  const theme = useTheme();
  const sending = state.mutation.isPending || documents.busy || refusal.busy;
  const busy = sending || state.frozen;
  const correction = state.target?.correction === true;
  const values = useWatch({ control: state.form.control, name: 'lines' });
  const hasReceived = values?.some(line => (line.receivedQty ?? 0) > 0) ?? false;
  const hasRefused = values?.some(line => (line.rejectedQty ?? 0) > 0) ?? false;
  const readyToSubmit = canSubmit && !sending && (!hasReceived || correction ||
    (!!locations.selected && !locations.query.isFetching && !locations.query.isError)) &&
    (!hasRefused || correction || (refusal.acknowledged && refusal.files.length > 0));
  const taskLines: ReceiptEditorLine[] = state.target?.task?.lines ?? [];
  const receiptLines: ReceiptEditorLine[] = receipt?.items.flatMap(item => item.inboundRequestItemId ? [{
    inboundRequestItemId: item.inboundRequestItemId, productSKU: item.productSKU, productName: item.productName,
    baseUnitId: item.baseUnitId, baseUnitName: item.baseUnitName, enteredUnitId: item.baseUnitId, enteredUnitName: item.baseUnitName,
    isLotTracked: !!item.lotId, remainingQuantity: item.orderedQuantity,
  }] : []) ?? [];
  const lines = [...taskLines, ...receiptLines.filter(item => !taskLines.some(line => line.inboundRequestItemId === item.inboundRequestItemId))];
  const renderItem = useCallback(({ item }: { item: ReceiptEditorLine }) => {
    const index = state.fields.fields.findIndex(value => value.inboundRequestItemId === item.inboundRequestItemId);
    return index < 0 ? correction ? null : <Button label={`Chọn nhận ${item.productSKU} · ${item.productName}`}
      disabled={busy} variant="outline" onPress={() => state.addLine(item.inboundRequestItemId)} />
      : <ReceiptLineFields form={state.form} index={index} item={item} correction={correction} legacy={receipt?.receivingFlowVersion === 0} busy={busy}
        onRemove={() => state.fields.remove(index)} />;
  }, [state, correction, busy, receipt?.receivingFlowVersion]);
  const conflict = state.mutation.error instanceof ApiError && state.mutation.error.statusCode === 409;
  return <Modal visible={!!state.target} animationType="slide" onRequestClose={sending ? undefined : state.close}>
    <SafeAreaProvider><SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList data={lines} keyExtractor={item => item.inboundRequestItemId} renderItem={renderItem}
          contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
          ListHeaderComponent={<View style={styles.group}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{correction ? 'Sửa phân loại kiểm hàng' : state.target?.receiptId ? 'Sửa phiếu nháp' : 'Lập phiếu thực nhận'}</Text>
            <AlertBanner title={correction ? 'Giữ nguyên số hàng đã nhận. Phân loại mới chỉ có hiệu lực sau khi gửi lại và được duyệt.'
              : 'Kiểm trước nhận: nhập riêng số lượng thực nhận và phần bên giao giữ/mang về. Từ chối toàn bộ thì nhập số lượng thực nhận 0. Lưu nháp chưa tăng tồn.'} />
            <Controller control={state.form.control} name="receiptCode" render={({ field, fieldState }) => <TextField
              label="Mã phiếu nhận" value={field.value} onChangeText={value => { state.markCodeEdited(); field.onChange(value); }} onBlur={field.onBlur}
              error={fieldState.error?.message} editable={!busy && !correction} autoCapitalize="characters" maxLength={101} />} />
            {!state.target?.receiptId && state.codeSuggestion.isFetching && <Text style={{ color: theme.textSecondary }}>Đang gợi ý mã phiếu…</Text>}
            {!state.target?.receiptId && state.codeSuggestion.isError && <>
              <AlertBanner title="Chưa tải được mã gợi ý. Bạn có thể nhập mã phiếu thủ công."
                description={getApiErrorMessage(state.codeSuggestion.error)} />
              <Button label="Tải lại mã gợi ý" variant="outline" disabled={busy} onPress={() => { void state.codeSuggestion.refetch(); }} />
            </>}
            <View pointerEvents={busy ? 'none' : 'auto'} style={styles.group}>
              {!correction && <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Vị trí tại khu chờ cất hàng</Text>
                <Text style={{ color: theme.textSecondary }}>Nơi hàng đang đặt chờ kiểm duyệt; chưa phải vị trí lưu trữ cuối cùng.</Text>
                <Button label={locations.selected?.displayPath ?? 'Chọn vị trí nhận hàng'} variant="outline"
                  disabled={busy} loading={locations.query.isFetching} onPress={locations.open} />
                {locations.query.isError && <AlertBanner title="Chưa tải được vị trí nhận hàng" description={getApiErrorMessage(locations.query.error)}>
                  <Button label="Tải lại vị trí" variant="outline" disabled={busy} onPress={() => { void locations.query.refetch(); }} />
                </AlertBanner>}
                {canSubmit && <>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Ảnh phiếu giao hàng (không bắt buộc)</Text>
                  <DocumentEvidencePanel state={documents} />
                  {hasRefused && <><Text style={[styles.sectionTitle, { color: theme.text }]}>Bằng chứng hàng từ chối</Text><RefusalEvidencePanel state={refusal} /></>}
                </>}
              </>}
            </View>
            {!canSubmit && <AlertBanner title="Bạn chưa có quyền gửi duyệt phiếu nhập. Bạn có thể lưu nháp; quản lý cần cấp quyền gửi duyệt để tiếp tục." />}
            {state.savedNotice && <AlertBanner title={state.savedNotice} />}
            {state.frozen && state.mutation.isError && <AlertBanner title="Nội dung đang được giữ nguyên để tránh gửi trùng."
              description="Thử lại cùng thao tác hoặc đóng form để tải lại phiếu và kiểm tra kết quả trên máy chủ trước khi sửa tiếp." />}
            {state.form.formState.errors.lines && <AlertBanner variant="destructive" title={state.form.formState.errors.lines.message ?? 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các dòng hàng.'} />}
            {state.mutation.error && <AlertBanner variant="destructive" title="Chưa lưu được phiếu" description={getApiErrorMessage(state.mutation.error)} />}
            {conflict && <AlertBanner title="Đóng form, tải lại phiếu và kiểm tra phiên bản mới trước khi sửa tiếp." />}
          </View>}
          ListFooterComponent={<View style={styles.group}>
            <Button label={state.frozen && !state.mutation.variables?.submission ? 'Thử lại lưu nháp' : correction ? 'Lưu phân loại đã sửa' : 'Lưu phiếu nháp'} loading={sending}
              disabled={conflict || (state.frozen && !!state.mutation.variables?.submission)} onPress={() => { void state.save(); }} />
            {canSubmit && <Button label={state.frozen && state.mutation.variables?.submission ? 'Thử lại lưu và gửi duyệt' : 'Lưu và gửi duyệt'} loading={sending}
              disabled={conflict || !readyToSubmit || (state.frozen && !state.mutation.variables?.submission)} onPress={() => { void state.save({
                receivingSlotId: correction ? receipt?.receivingSlotId ?? null : hasReceived ? locations.selected?.id ?? null : null,
                ...(!correction && hasRefused ? { refusedGoodsHandedBack: true, refusalEvidenceIds: refusal.files.map(file => file.id) } : {}),
                ...(!correction && documents.files.length ? { documentEvidenceIds: documents.files.map(file => file.id) } : {}),
              }); }} />}
            <Button label="Đóng nhập liệu" variant="outline" disabled={sending} onPress={state.close} />
          </View>} />
      </KeyboardAvoidingView>
      <ConfirmationModal visible={state.discard} title="Bỏ thay đổi chưa lưu?"
        description="Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang không?" busy={busy}
        onConfirm={state.discardChanges} onCancel={() => state.setDiscard(false)} />
      <LocationPicker state={locations} title="Vị trí tại khu chờ cất hàng" />
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 16 },
  group: { gap: 14 }, title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 },
  sectionTitle: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 } });
