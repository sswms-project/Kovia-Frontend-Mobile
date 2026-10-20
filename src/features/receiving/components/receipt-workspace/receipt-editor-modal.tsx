import { useCallback } from 'react';
import { Controller } from 'react-hook-form';
import { FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

interface ReceiptEditorModalProps { readonly state: ReturnType<typeof useReceiptEditor>; readonly receipt?: Receipt }
export function ReceiptEditorModal({ state, receipt }: ReceiptEditorModalProps) {
  const theme = useTheme();
  const busy = state.mutation.isPending;
  const correction = state.target?.correction === true;
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
  return <Modal visible={!!state.target} animationType="slide" onRequestClose={busy ? undefined : state.close}>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList data={lines} keyExtractor={item => item.inboundRequestItemId} renderItem={renderItem}
          contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
          ListHeaderComponent={<View style={styles.group}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{correction ? 'Sửa phân loại kiểm hàng' : state.target?.receiptId ? 'Sửa phiếu nháp' : 'Lập phiếu thực nhận'}</Text>
            <AlertBanner title={correction ? 'Giữ nguyên số hàng đã nhận. Phân loại mới chỉ có hiệu lực sau khi gửi lại và được duyệt.'
              : 'Kiểm trước nhận: nhập riêng phần chấp nhận và phần bên giao giữ/mang về. Từ chối toàn bộ thì nhập chấp nhận 0. Lưu nháp chưa tăng tồn.'} />
            <Controller control={state.form.control} name="receiptCode" render={({ field, fieldState }) => <TextField
              label="Mã phiếu nhận" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
              error={fieldState.error?.message} editable={!busy && !correction} autoCapitalize="characters" maxLength={101} />} />
            {state.form.formState.errors.lines && <AlertBanner variant="destructive" title={state.form.formState.errors.lines.message ?? 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các dòng hàng.'} />}
            {state.mutation.error && <AlertBanner variant="destructive" title="Chưa lưu được phiếu" description={getApiErrorMessage(state.mutation.error)} />}
            {conflict && <AlertBanner title="Đóng form, tải lại phiếu và kiểm tra phiên bản mới trước khi sửa tiếp." />}
          </View>}
          ListFooterComponent={<View style={styles.group}>
            <Button label={correction ? 'Lưu phân loại đã sửa' : 'Lưu phiếu nháp'} loading={busy} disabled={conflict} onPress={() => { void state.save(); }} />
            <Button label="Đóng nhập liệu" variant="outline" disabled={busy} onPress={state.close} />
          </View>} />
      </KeyboardAvoidingView>
      <ConfirmationModal visible={state.discard} title="Bỏ thay đổi chưa lưu?"
        description="Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang không?" busy={busy}
        onConfirm={state.discardChanges} onCancel={() => state.setDiscard(false)} />
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 16 },
  group: { gap: 14 }, title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 } });
