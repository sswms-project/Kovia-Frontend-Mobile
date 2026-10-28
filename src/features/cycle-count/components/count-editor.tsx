import { WorkScreenHeader } from '@/components/work-screen-header';
import { useModalExit } from '@/hooks/use-screen-exit';
import { useState } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { ScannerScreen } from '@/features/scanner/screens/scanner-screen';
import { useTheme } from '@/hooks/use-theme';

import type { CountForm, CountItem } from '../cycle-count.schema';

interface Props { readonly item: CountItem; readonly form: UseFormReturn<CountForm>; readonly busy: boolean; readonly canScan: boolean;
  readonly notice: string | null; readonly files: readonly { id: string; fileName: string }[];
  readonly onPhoto: (source: 'camera' | 'library') => void; readonly onReview: () => void; readonly onClose: () => void }
export function CountEditor({ item, form, busy, canScan, notice, files, onPhoto, onReview, onClose }: Props) {
  const theme = useTheme();
  const close = useModalExit(onClose); const [scanner, setScanner] = useState(false);
  const photoCount = files.length + (item.damageEvidence?.length ?? 0);
  return <>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <WorkScreenHeader modal title="Nhập kết quả kiểm kê" onBack={close} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Ghi nhận số đếm thực tế</Text>
        <Text style={[styles.text, { color: theme.text }]}>{item.productSku} · {item.productName} · {item.slotCode}</Text>
        <AlertBanner title="Đếm theo đơn vị cơ sở" description={`Đơn vị: ${item.unitName ?? 'đơn vị cơ sở'}. Đếm cả phần hỏng vào tổng số thực tế; số hỏng là một phần của tổng, không cộng thêm. Ghi đếm không điều chỉnh tồn kho.`} />
        {notice && <AlertBanner title={notice} />}
        {(['countedQuantity', 'countedDamagedQuantity'] as const).map(name => <Controller key={name} control={form.control} name={name}
          render={({ field, fieldState }) => <TextField label={name === 'countedQuantity' ? 'Tổng số thực tế đếm được' : 'Số hỏng trong tổng số đếm'}
            value={Number.isFinite(field.value) ? String(field.value) : ''} keyboardType="decimal-pad" editable={!busy}
            onChangeText={value => field.onChange(value.trim() ? Number(value.replace(',', '.')) : Number.NaN)} onBlur={field.onBlur} error={fieldState.error?.message} />} />)}
        <Controller control={form.control} name="damageReason" render={({ field, fieldState }) => <TextField
          label="Lý do/biểu hiện hỏng" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
          editable={!busy} multiline maxLength={501} />} />
        <View style={styles.files}>
          {item.damageEvidence?.map(file => <Text key={file.id} style={[styles.text, { color: theme.textSecondary }]}>Ảnh đã lưu: {file.fileName}</Text>)}
          {files.map(file => <Text key={file.id} style={[styles.text, { color: theme.textSecondary }]}>Ảnh đã chọn: {file.fileName}</Text>)}
          <Button label={`Chụp ảnh hàng hỏng (${photoCount}/3)`} variant="outline" disabled={busy || photoCount >= 3} onPress={() => onPhoto('camera')} />
          <Button label="Chọn ảnh có sẵn" variant="ghost" disabled={busy || photoCount >= 3} onPress={() => onPhoto('library')} />
        </View>
        {canScan && <Button label="Quét xác nhận sản phẩm kiểm kê" variant="outline" disabled={busy} onPress={() => setScanner(true)} />}
        <Controller control={form.control} name="countMethod" render={({ field }) => <Text style={[styles.text, { color: theme.textSecondary }]}>
          Cách ghi nhận: {field.value === 'Scanned' ? 'Đã quét xác nhận sản phẩm' : 'Nhập tay'}
        </Text>} />
        <Controller control={form.control} name="note" render={({ field, fieldState }) => <TextField label="Ghi chú kiểm đếm"
          value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} editable={!busy} multiline maxLength={501} />} />
        <Button label="Kiểm tra và lưu số đếm" loading={busy} onPress={onReview} />
        <Button label="Đóng nhập kiểm kê" variant="outline" disabled={busy} onPress={close} />
      </ScrollView>
    </KeyboardAvoidingView>
    <Modal visible={scanner && canScan} onRequestClose={() => setScanner(false)}>
      <SafeAreaView style={styles.root}>{scanner && canScan && <ScannerScreen title="Quét sản phẩm đang kiểm đếm" onClose={() => setScanner(false)}
        onScan={code => {
          const value = code.trim().toLowerCase();
          if (value !== item.productBarcode?.trim().toLowerCase() && value !== item.productSku.trim().toLowerCase()) return false;
          form.setValue('scannedBarcode', code, { shouldDirty: true }); form.setValue('countMethod', 'Scanned', { shouldDirty: true }); setScanner(false); return true;
        }} />}</SafeAreaView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 18 },
  files: { gap: 10 }, title: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 32 }, text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
