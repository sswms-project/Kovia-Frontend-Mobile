import { Controller } from 'react-hook-form';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { useReceiptExecution } from '../../hooks/use-receipt-execution';
import type { Receipt } from '../../receiving.schema';
import { ConfirmationModal } from './confirmation-modal';
import { parseQuantity, quantityInput } from './receipt-line-fields';

interface PutAwayEditorModalProps { readonly state: ReturnType<typeof useReceiptExecution>; readonly receipt?: Receipt }
export function PutAwayEditorModal({ state, receipt }: PutAwayEditorModalProps) {
  const theme = useTheme();
  const busy = state.mutation.isPending;
  const isolation = state.editor?.isolation === true;
  const item = receipt?.items.find(value => value.id === state.form.getValues('goodsReceiptItemId'));
  return <Modal visible={!!state.editor} animationType="slide" onRequestClose={busy ? undefined : state.closeEditor}>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{isolation ? 'Cách biệt hàng hỏng đã nhập' : 'Ghi nhận cất hàng thực tế'}</Text>
          <Text style={[styles.text, { color: theme.text }]}>{item?.productSKU} · {item?.productName} · Đơn vị cơ sở: {item?.baseUnitName}</Text>
          <AlertBanner title={`Đích: ${state.editor?.destination.displayPath ?? ''}`}
            description={isolation ? 'Chỉ xác nhận sau khi chuyển sang vị trí riêng không có hàng đạt/chờ kiểm. Hàng hỏng vẫn Hold, không giảm tổng tồn và không phải trả hàng hay tiêu hủy.' : 'Nhập số thực tế vừa cất theo đơn vị cơ sở. Thao tác chuyển hàng khỏi vị trí nhận, giữ nguyên tổng tồn kho.'} />
          <Controller control={state.form.control} name="quantity" render={({ field, fieldState }) => <TextField
            label={isolation ? 'Số lượng thực tế đã cách biệt' : 'Số lượng thực cất'} value={quantityInput(field.value)} keyboardType="decimal-pad" editable={!busy}
            onChangeText={value => field.onChange(parseQuantity(value))} onBlur={field.onBlur} error={fieldState.error?.message} />} />
          <Controller control={state.form.control} name="confirmedSlotCode" render={({ field, fieldState }) => <TextField
            label="Mã vị trí thực tế" value={field.value} autoCapitalize="characters" editable={!busy} maxLength={101}
            onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
            hint="Nhập mã trên nhãn vị trí. Nếu không xác nhận được mã hoặc cất khác kế hoạch, ghi rõ lý do bên dưới." />} />
          {!isolation && <Controller control={state.form.control} name="overrideReason" render={({ field, fieldState }) => <TextField
            label="Lý do cất khác kế hoạch hoặc không xác nhận mã" value={field.value} multiline editable={!busy} maxLength={501}
            onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} hint="Mô tả ít nhất 5 ký tự khi áp dụng." />} />}
          <Button label={isolation ? 'Kiểm tra và xác nhận cách biệt' : 'Kiểm tra và xác nhận cất hàng'} loading={busy} onPress={() => { void state.reviewPlacement(); }} />
          <Button label="Đóng nhập cất hàng" variant="outline" disabled={busy} onPress={state.closeEditor} />
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmationModal visible={!!state.target} title={isolation ? 'Xác nhận đã cách biệt hàng hỏng?' : 'Xác nhận đã cất hàng?'}
        description={`${isolation ? 'Tôi xác nhận đã chuyển hàng hỏng sang vị trí riêng. ' : ''}Số lượng ${state.target?.placement?.quantity ?? ''} theo đơn vị cơ sở chuyển từ vị trí nhận sang ${state.editor?.destination.displayPath ?? ''}. Tổng tồn không đổi.${isolation ? ' Hàng vẫn Hold, không được xuất.' : ''}`}
        busy={busy} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancelConfirmation} />
      <ConfirmationModal visible={state.discard} title="Bỏ thay đổi chưa lưu?"
        description="Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang không?" busy={busy}
        onConfirm={state.discardChanges} onCancel={() => state.setDiscard(false)} />
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 18 },
  title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 }, text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
