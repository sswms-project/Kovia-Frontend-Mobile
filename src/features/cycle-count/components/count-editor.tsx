import { Camera, ImagePlus, ScanLine } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View, type TextInput } from 'react-native';
import { WorkScreenHeader } from '@/components/work-screen-header';
import { WorkActionBar } from '@/components/work-action-bar';
import { useModalExit } from '@/hooks/use-screen-exit';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { formatCountLocation } from '../cycle-count';
import { codesMatch } from '@/features/scanner/warehouse-scan';
import { useTheme } from '@/hooks/use-theme';
import type { CountForm, CountItem } from '../cycle-count.schema';

interface Props { readonly item: CountItem; readonly form: UseFormReturn<CountForm>; readonly busy: boolean; readonly canScan: boolean;
  readonly submitDisabled: boolean; readonly notice: string | null; readonly files: readonly { id: string; fileName: string }[];
  readonly onPhoto: (source: 'camera' | 'library') => void; readonly onRemovePhoto: (id: string) => void;
  readonly onReview: () => void; readonly onClose: () => void }
export function CountEditor({ item, form, busy, canScan, submitDisabled, notice, files, onPhoto, onRemovePhoto, onReview, onClose }: Props) {
  const theme = useTheme(), close = useModalExit(onClose);
  const [eachUnit, setEachUnit] = useState(false), [cameraOpen, setCameraOpen] = useState(false);
  const quantityRef = useRef<TextInput>(null);
  const values = useWatch({ control: form.control });
  const photoCount = files.length + (item.damageEvidence?.length ?? 0);
  const quantity = values.countedQuantity ?? Number.NaN;
  useEffect(() => {
    if (!cameraOpen && values.scannedBarcode && !eachUnit && !busy) quantityRef.current?.focus();
  }, [cameraOpen, values.scannedBarcode, eachUnit, busy]);
  function adjust(delta: number) {
    if (busy || submitDisabled) return;
    const current = form.getValues('countedQuantity');
    const next = Math.round(((Number.isFinite(current) ? current : 0) + delta) * 100) / 100;
    if (next >= 0 && Number.isSafeInteger(Math.round(next * 100))) form.setValue('countedQuantity', next, { shouldDirty: true, shouldValidate: true });
  }
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <WorkScreenHeader modal title="Ghi số đếm kiểm kê" onBack={close} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <Text style={[styles.text, { color: theme.textSecondary }]}>{item.productSku}</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{item.productName}</Text>
        <Text style={[styles.text, { color: theme.text }]}>{formatCountLocation(item)}</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Lô {item.lotNumber ?? 'không có'} · {item.qualityStatus === 'Good' ? 'Hàng đạt' : item.qualityStatus === 'Damaged' ? 'Hàng hỏng' : 'Cách ly'} · Đơn vị {item.unitName ?? 'cơ sở'}</Text>
      </View>
      {notice && <AlertBanner title={notice} />}
      {canScan && <>
        <ScanCodeButton continuous label="Quét mã hàng" title={`Kiểm đếm ${item.productSku}`} renderIcon={color => <ScanLine size={22} color={color} />}
          disabled={busy || submitDisabled} showScannedCode={false} onOpen={() => setCameraOpen(true)} onClose={() => setCameraOpen(false)}
          status={eachUnit ? `Quét cộng 1 ${item.unitName ?? 'đơn vị'} vào tổng số đếm.` : 'Quét đúng hàng rồi nhập số đã đếm thực tế.'}
          closeAfterScan={() => !eachUnit} confirm={eachUnit ? { label: 'Kiểm tra số đếm', disabled: !Number.isFinite(quantity), onPress() {} } : undefined}
          onScan={code => {
            if (busy || submitDisabled || !codesMatch(code, item.productSku, item.productBarcode) || code.trim().length > 100) return false;
            if (eachUnit) {
              const current = form.getValues('countedQuantity');
              const next = (Number.isFinite(current) ? current : 0) + 1;
              if (!Number.isSafeInteger(Math.round(next * 100))) return false;
              form.setValue('countedQuantity', next, { shouldDirty: true, shouldValidate: true });
            }
            form.setValue('scannedBarcode', code.trim(), { shouldDirty: true });
            form.setValue('countMethod', 'Scanned', { shouldDirty: true }); return true;
          }} />
        <View style={styles.option}><Text style={[styles.text, styles.grow, { color: theme.text }]}>Mỗi lần quét cộng 1 {item.unitName ?? 'đơn vị'}</Text>
          <Switch accessibilityLabel="Mỗi lần quét cộng 1" value={eachUnit} disabled={busy || submitDisabled} onValueChange={setEachUnit} /></View>
      </>}
      <AlertBanner title="Tổng số đếm gồm cả hàng hỏng" description="Ví dụ đếm được 10, trong đó hỏng 2: nhập tổng 10 và số hỏng 2. Không nhập số sổ sách thay số thực đếm." />
      <Text style={[styles.label, { color: theme.text }]}>Tổng số đếm ({item.unitName ?? 'đơn vị cơ sở'})</Text>
      <View style={styles.quantityRow}>
        <Button label="−" accessibilityLabel="Giảm số đếm 1 đơn vị" variant="outline" disabled={busy || submitDisabled || !Number.isFinite(quantity) || quantity < 1} onPress={() => adjust(-1)} />
        <View style={styles.grow}><Controller control={form.control} name="countedQuantity" render={({ field, fieldState }) => <TextField hideLabel label="Tổng số thực tế đếm được"
          inputRef={quantityRef} selectTextOnFocus value={Number.isFinite(field.value) ? String(field.value) : ''} keyboardType="decimal-pad" editable={!busy}
          onChangeText={value => field.onChange(value.trim() ? Number(value.replace(',', '.')) : Number.NaN)} onBlur={field.onBlur} error={fieldState.error?.message} />} /></View>
        <Button label="+" accessibilityLabel="Tăng số đếm 1 đơn vị" variant="outline" disabled={busy || submitDisabled} onPress={() => adjust(1)} />
      </View>
      <Controller control={form.control} name="countedDamagedQuantity" render={({ field, fieldState }) => <TextField label="Trong đó hỏng"
        value={Number.isFinite(field.value) ? String(field.value) : ''} keyboardType="decimal-pad" editable={!busy}
        onChangeText={value => field.onChange(value.trim() ? Number(value.replace(',', '.')) : Number.NaN)} onBlur={field.onBlur} error={fieldState.error?.message} />} />
      {(values.countedDamagedQuantity ?? 0) > 0 && <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <Text style={[styles.label, { color: theme.text }]}>Bằng chứng hàng hỏng · {photoCount}/3 ảnh</Text>
        <Controller control={form.control} name="damageReason" render={({ field, fieldState }) => <TextField label="Lý do / biểu hiện hỏng"
          value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} editable={!busy} multiline maxLength={500} />} />
        {item.damageEvidence?.map(file => <Text key={file.id} style={[styles.text, { color: theme.textSecondary }]}>Ảnh đã lưu: {file.fileName}</Text>)}
        {files.map(file => <View key={file.id} style={styles.option}><Text style={[styles.text, styles.grow, { color: theme.textSecondary }]}>{file.fileName}</Text>
          <Button label="Bỏ ảnh" accessibilityLabel={`Bỏ ảnh ${file.fileName}`} variant="ghost" disabled={busy} onPress={() => onRemovePhoto(file.id)} /></View>)}
        <Button label="Chụp ảnh hàng hỏng" variant="outline" disabled={busy || photoCount >= 3} renderIcon={color => <Camera size={20} color={color} />} onPress={() => onPhoto('camera')} />
        <Button label="Chọn ảnh từ thư viện" variant="outline" disabled={busy || photoCount >= 3} renderIcon={color => <ImagePlus size={20} color={color} />} onPress={() => onPhoto('library')} />
      </View>}
      <Text style={[styles.text, { color: theme.textSecondary }]}>Cách ghi nhận: {values.countMethod === 'Scanned' ? 'Đã quét mã hàng' : 'Nhập tay'}</Text>
      <Controller control={form.control} name="note" render={({ field, fieldState }) => <TextField label="Ghi chú (nếu có)" value={field.value}
        onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} editable={!busy} multiline maxLength={500} />} />
    </ScrollView>
    <WorkActionBar hint="Lưu từng dòng, tiếp tục tại vị trí đang kiểm. Gửi quản lý sau khi đủ tất cả dòng.">
      <Button label="Kiểm tra và lưu số đếm" disabled={submitDisabled} loading={busy} onPress={onReview} />
    </WorkActionBar>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 16, gap: 16 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 }, quantityRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10 }, grow: { flex: 1, minWidth: 0 },
  title: { fontFamily: FontFamily.bold, fontSize: 23, lineHeight: 31 }, label: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 22 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 } });
