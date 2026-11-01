import { CircleCheck, Minus, Plus, ScanLine } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { WorkDetails } from '@/components/ui/work-details';
import { FontFamily, Radius } from '@/constants/theme';
import { formatInventoryLocation } from '@/features/inventory/inventory.labels';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { useTheme } from '@/hooks/use-theme';
import { formatQuantity } from '@/lib/number-format';
import { matchesReturnCode } from '../return-work';
import type { ReturnForm, SupplierReturn } from '../return-work.schema';

interface Props { readonly line: SupplierReturn['items'][number]; readonly index: number; readonly form: UseFormReturn<ReturnForm>; readonly disabled: boolean; readonly editable: boolean }
export function SupplierReturnLine({ line, index, form, disabled, editable }: Props) {
  const theme = useTheme(); const [input, setInput] = useState(''); const [error, setError] = useState<string | null>(null);
  const quantityRef = useRef<TextInput>(null); const [focusRequest, setFocusRequest] = useState(0); const [keyboard, setKeyboard] = useState(true);
  const current = useWatch({ control: form.control, name: `lines.${index}` });
  const sourceCodes = line.sourceScanCodes ?? []; const productCodes = line.productScanCodes ?? [line.sku];
  const locationConfirmed = matchesReturnCode(current?.scannedSlotCode ?? '', sourceCodes);
  const productConfirmed = locationConfirmed && matchesReturnCode(current?.scannedProductCode ?? '', productCodes);
  const currentValue = () => form.getValues(`lines.${index}`);
  const precision = Math.min(line.quantityPrecision ?? 2, 2); const step = 10 ** -precision;
  function changeQuantity(amount: number) { form.setValue(`lines.${index}.deliveredQuantity`, amount, { shouldDirty: true, shouldValidate: true }); }
  function scan(code: string) {
    if (disabled || !editable) return false;
    const location = matchesReturnCode(currentValue()?.scannedSlotCode ?? '', sourceCodes);
    if (!matchesReturnCode(code, location ? productCodes : sourceCodes)) { setError(location ? 'Mã hàng chưa khớp sản phẩm cần trả.' : 'Mã vị trí chưa khớp nơi lấy hàng của dòng này.'); return false; }
    setError(null); setInput('');
    if (!location) {
      form.setValue(`lines.${index}.scannedProductCode`, null, { shouldDirty: true });
      form.setValue(`lines.${index}.scannedSlotCode`, code.trim(), { shouldDirty: true, shouldValidate: true });
    } else form.setValue(`lines.${index}.scannedProductCode`, code.trim(), { shouldDirty: true, shouldValidate: true });
    return true;
  }
  useEffect(() => { if (focusRequest > 0) quantityRef.current?.focus(); }, [focusRequest]);
  function afterScan() {
    if (matchesReturnCode(currentValue()?.scannedProductCode ?? '', productCodes)) { setKeyboard(false); setFocusRequest(value => value + 1); }
  }
  const quantity = current?.deliveredQuantity;
  const verified = quantity === 0 || productConfirmed;
  return <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
    <Text style={[styles.title, { color: theme.text }]}>{line.productName}</Text>
    <Text style={[styles.meta, { color: theme.textSecondary }]}>{line.sku} · Lô {line.lotNumber || 'không có'}</Text>
    <Text style={[styles.meta, { color: theme.textSecondary }]}>Lấy tại: {line.sourceLocation || formatInventoryLocation(line)}</Text>
    <Text style={[styles.meta, { color: theme.text }]}>Đã duyệt: {formatQuantity(line.quantity)} {line.unit}</Text>
    {!editable ? <Text style={[styles.meta, { color: theme.textSecondary }]}>{line.deliveredQuantity !== null ? `Đã giao: ${formatQuantity(line.deliveredQuantity)} ${line.unit}` : 'Bắt đầu công việc để quét và ghi số thực giao.'}</Text> :
    <WorkDetails title={verified ? quantity === 0 ? 'Không giao dòng này' : 'Đã kiểm tra vị trí và hàng hóa' : 'Quét và nhập số thực giao'} defaultOpen={index === 0}>
      {productConfirmed && <View style={styles.checked}><CircleCheck size={20} color={theme.primary} /><Text style={[styles.meta, { color: theme.primary }]}>Đã kiểm tra vị trí và hàng hóa</Text></View>}
      <ScanCodeButton continuous label={productConfirmed ? 'Quét lại' : 'Quét vị trí và mã hàng'} title="Kiểm tra hàng trả NCC"
        renderIcon={color => <ScanLine size={21} color={color} />} disabled={disabled || !sourceCodes.length} showScannedCode={false}
        status={`${locationConfirmed ? '2. Quét mã hàng' : '1. Quét vị trí nguồn'} · ${locationConfirmed ? line.productName : line.sourceLocation || formatInventoryLocation(line)}`}
        onOpen={() => { if (productConfirmed) { form.setValue(`lines.${index}.scannedSlotCode`, null, { shouldDirty: true }); form.setValue(`lines.${index}.scannedProductCode`, null, { shouldDirty: true }); } setError(null); }}
        onScan={scan} closeAfterScan={() => matchesReturnCode(currentValue()?.scannedProductCode ?? '', productCodes)} onClose={afterScan} />
      {!sourceCodes.length && <AlertBanner title="Chưa có thông tin mã vị trí nguồn" description="Tải lại phiếu trước khi giao hàng." />}
      {!productConfirmed && <WorkDetails title="Nhập mã thay cho camera">
        <TextField label={locationConfirmed ? 'Mã hàng' : 'Mã vị trí nguồn'} value={input} onChangeText={setInput} editable={!disabled} autoCapitalize="none" autoCorrect={false} maxLength={100}
          onSubmitEditing={() => { if (scan(input)) afterScan(); }} />
        <Button label="Kiểm tra mã" variant="outline" disabled={disabled || !input.trim()} onPress={() => { if (scan(input)) afterScan(); }} />
      </WorkDetails>}
      <Controller control={form.control} name={`lines.${index}.deliveredQuantity`} render={({ field, fieldState }) => <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text }]}>SL thực giao ({line.unit})</Text>
        <View style={styles.stepper}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Giảm số lượng giao ${line.productName}`} disabled={disabled || !Number.isFinite(quantity) || quantity! < step}
            accessibilityState={{ disabled: disabled || !Number.isFinite(quantity) || quantity! < step }} onPress={() => changeQuantity(Number(Math.max(0, (quantity ?? 0) - step).toFixed(precision)))}
            style={[styles.step, { borderColor: theme.border, opacity: disabled || !Number.isFinite(quantity) || quantity! < step ? 0.4 : 1 }]}><Minus size={20} color={theme.primary} /></Pressable>
          <View style={styles.input}><TextField label={`SL thực giao ${line.productName}`} hideLabel inputRef={quantityRef} value={Number.isFinite(field.value) ? String(field.value) : ''}
            keyboardType="decimal-pad" showSoftInputOnFocus={keyboard} editable={!disabled} onBlur={field.onBlur}
            onPressIn={() => { if (!keyboard) { quantityRef.current?.blur(); setKeyboard(true); setFocusRequest(value => value + 1); } }}
            onChangeText={value => field.onChange(value.trim() ? Number(value.replace(',', '.')) : Number.NaN)} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Tăng số lượng giao ${line.productName}`} disabled={disabled || (Number.isFinite(quantity) && quantity! + step > line.quantity)}
            accessibilityState={{ disabled: disabled || (Number.isFinite(quantity) && quantity! + step > line.quantity) }}
            onPress={() => changeQuantity(Number(((Number.isFinite(quantity) ? quantity! : 0) + step).toFixed(precision)))}
            style={[styles.step, { borderColor: theme.border, opacity: disabled || (Number.isFinite(quantity) && quantity! + step > line.quantity) ? 0.4 : 1 }]}><Plus size={20} color={theme.primary} /></Pressable>
        </View>
        {fieldState.error && <Text accessibilityRole="alert" style={[styles.meta, { color: theme.error }]}>{fieldState.error.message}</Text>}
      </View>} />
      {Number.isFinite(quantity) && quantity! >= 0 && quantity! <= line.quantity && <Text style={[styles.meta, { color: theme.textSecondary }]}>Chưa giao: {formatQuantity(line.quantity - quantity!)} {line.unit}{quantity === 0 ? ' · Không trừ tồn dòng này' : ''}</Text>}
      {error && <Text accessibilityRole="alert" style={[styles.meta, { color: theme.error }]}>{error}</Text>}
    </WorkDetails>}
  </View>;
}
const styles = StyleSheet.create({ card: { padding: 16, gap: 10, borderWidth: 1, borderRadius: Radius.lg }, title: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 24 },
  meta: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 }, label: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 21 },
  checked: { flexDirection: 'row', alignItems: 'center', gap: 8 }, field: { gap: 8 }, stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 }, input: { flex: 1, minWidth: 0 },
  step: { minHeight: 52, width: 48, borderWidth: 1, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' } });
