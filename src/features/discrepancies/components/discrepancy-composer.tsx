import { Controller, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { SelectionField } from '@/components/ui/selection-field';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import type { useDiscrepancyComposer } from '../hooks/use-discrepancy-composer';
import { DISCREPANCY_TYPE, discrepancyTypeSchema } from '../discrepancies.schema';

type Composer = ReturnType<typeof useDiscrepancyComposer>;
export function DiscrepancyComposer({ state, title, summary, evidenceOnly = false }: {
  readonly state: Composer; readonly title: string; readonly summary: string; readonly evidenceOnly?: boolean;
}) {
  const theme = useTheme();
  const type = useWatch({ control: state.form.control, name: 'type' });
  const disabled = state.busy || state.frozen;
  return <Modal visible={state.open} animationType="slide" onRequestClose={state.requestClose}>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{summary}</Text>
          <AlertBanner title="Ghi nhận hiện trường, chưa điều chỉnh tồn" description="Quản lý rà soát trên web và quyết định kiểm đếm hoặc lập phiếu điều chỉnh riêng." />
          {!evidenceOnly && <>
            <Controller control={state.form.control} name="type" render={({ field }) => <SelectionField label="Loại sai lệch" value={field.value}
              disabled={disabled} options={Object.entries(DISCREPANCY_TYPE).map(([value, label]) => ({ value, label }))}
              onChange={(value) => field.onChange(discrepancyTypeSchema.parse(value))} />} />
            <Controller control={state.form.control} name="quantity" render={({ field, fieldState }) => <TextField
              label={type === 'Shortage' ? 'Số thiếu (nhập số dương)' : type === 'Excess' ? 'Số thừa (nhập số dương)' : 'Chênh lệch tại vị trí hiện tại (+/-)'}
              value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
              keyboardType={type === 'WrongLocation' ? 'numbers-and-punctuation' : 'decimal-pad'} editable={!disabled} />} />
            {type === 'WrongLocation' && <Controller control={state.form.control} name="correctSlotCode" render={({ field, fieldState }) => <TextField
              label="Mã vị trí đúng" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message}
              maxLength={512} autoCapitalize="none" editable={!disabled} />} />}
            {type === 'WrongLocation' && !disabled && <ScanCodeButton label="Quét mã vị trí đúng" title="Quét vị trí lưu hàng đúng trong kho"
              onScan={(code) => {
                if (!code.trim() || code.trim().length > 512 || /\p{Cc}/u.test(code)) return false;
                state.form.setValue('correctSlotCode', code.trim(), { shouldDirty: true, shouldValidate: true }); return true;
              }} />}
            <Controller control={state.form.control} name="description" render={({ field, fieldState }) => <TextField
              label="Mô tả hiện trường" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
              error={fieldState.error?.message} maxLength={1000} multiline editable={!disabled} />} />
          </>}
          <Text style={[styles.text, { color: theme.text }]}>Ảnh bằng chứng ({state.photos.photos.length}/3)</Text>
          {state.photos.photos.map((photo) => <View key={photo.id} style={styles.photo}>
            <Text style={[styles.photoName, { color: theme.text }]}>{photo.fileName}</Text>
            <Button label="Xóa" variant="ghost" disabled={disabled} onPress={() => state.photos.remove(photo.id)} />
          </View>)}
          <Button label="Chụp ảnh bằng chứng" variant="outline" disabled={disabled || state.photos.photos.length >= 3}
            loading={state.photos.isUploading} onPress={() => { void state.photos.add(); }} />
          <Button label="Chọn ảnh có sẵn" variant="outline" disabled={disabled || state.photos.isUploading || state.photos.photos.length >= 3}
            onPress={() => { void state.photos.choose(); }} />
          {state.photos.error && <AlertBanner variant="destructive" title={state.photos.error} />}
          {state.error && <AlertBanner variant="destructive" title={state.error} />}
          {state.frozen && <AlertBanner title={evidenceOnly ? 'Nội dung gửi được giữ nguyên' : 'Giữ nguyên nội dung và mã thao tác khi thử lại'}
            description={evidenceOnly ? 'Nếu báo cáo đã được cập nhật, đóng và tải lại để đối chiếu trước khi bổ sung tiếp.' : 'Nếu mất kết nối, thử lại sẽ dùng cùng lệnh để tránh tạo hai báo cáo.'} />}
          <Button label={state.frozen ? 'Thử gửi lại' : evidenceOnly ? 'Gửi bổ sung bằng chứng' : 'Gửi báo cáo cho quản lý'}
            loading={state.busy} onPress={state.submit} />
          <Button label="Đóng" variant="ghost" disabled={state.busy} onPress={state.requestClose} />
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmationModal visible={state.discard} title="Rời báo cáo đang nhập?" busy={state.busy}
        description="Dữ liệu chưa gửi sẽ bị bỏ. Nếu đã gửi nhưng chưa nhận kết quả, hãy kiểm tra danh sách báo cáo trước khi lập lại."
        onConfirm={state.close} onCancel={() => state.setDiscard(false)} />
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, gap: 16, paddingBottom: 36, maxWidth: 760, width: '100%', alignSelf: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 32 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 },
  photo: { flexDirection: 'row', alignItems: 'center', gap: 8 }, photoName: { flex: 1, fontFamily: FontFamily.regular, fontSize: 13 } });
