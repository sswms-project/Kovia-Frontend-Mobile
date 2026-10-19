import { memo } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { ReceiptForm } from '../../receiving.schema';

export interface ReceiptEditorLine {
  inboundRequestItemId: string; productSKU: string; productName: string;
  baseUnitId: string; baseUnitName: string; enteredUnitId: string; enteredUnitName: string;
  isLotTracked: boolean; remainingQuantity: number;
}
interface ReceiptLineFieldsProps {
  readonly form: UseFormReturn<ReceiptForm>; readonly index: number; readonly item: ReceiptEditorLine;
  readonly correction: boolean; readonly legacy: boolean; readonly busy: boolean; readonly onRemove: () => void;
}
export function parseQuantity(value: string) { return value.trim() ? Number(value.replace(',', '.')) : Number.NaN; }
export function quantityInput(value: number) { return Number.isFinite(value) ? String(value) : ''; }
export const ReceiptLineFields = memo(function ReceiptLineFields({ form, index, item, correction, legacy, busy, onRemove }: ReceiptLineFieldsProps) {
  const theme = useTheme();
  return <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
    <Text style={[styles.name, { color: theme.text }]}>{item.productSKU} · {item.productName}</Text>
    {!correction && <Text style={[styles.text, { color: theme.textSecondary }]}>Còn được nhận: {item.remainingQuantity} {item.baseUnitName}</Text>}
    <Controller control={form.control} name={`lines.${index}.enteredUnitId`} render={({ field }) => <View style={styles.group}>
      <Button label={`Đơn vị: ${item.baseUnitName}`} variant={field.value === item.baseUnitId ? 'primary' : 'outline'} disabled={busy || correction}
        onPress={() => { field.onChange(item.baseUnitId); form.setValue(`lines.${index}.receivedQty`, Number.NaN); form.setValue(`lines.${index}.damagedQty`, 0); }} />
      {item.enteredUnitId !== item.baseUnitId && <Button label={`Đơn vị: ${item.enteredUnitName}`}
        variant={field.value === item.enteredUnitId ? 'primary' : 'outline'} disabled={busy || correction}
        onPress={() => { field.onChange(item.enteredUnitId); form.setValue(`lines.${index}.receivedQty`, Number.NaN); form.setValue(`lines.${index}.damagedQty`, 0); }} />}
    </View>} />
    <Controller control={form.control} name={`lines.${index}.receivedQty`} render={({ field, fieldState }) => <TextField
      label={`${legacy ? 'Số thực nhận lịch sử' : 'Số chấp nhận nhận'} ${item.productSKU}`} value={quantityInput(field.value)} onChangeText={value => field.onChange(parseQuantity(value))}
      onBlur={field.onBlur} error={fieldState.error?.message} editable={!busy && !correction} keyboardType="decimal-pad"
      hint={correction ? 'Hàng đã nhận được giữ nguyên; chỉ sửa phân loại.' : 'Nhập số đã kiểm đếm thực tế theo đơn vị đang chọn.'} />} />
    {!correction && !legacy && <Controller control={form.control} name={`lines.${index}.rejectedQty`} render={({ field, fieldState }) => <TextField
      label={`Số từ chối trước nhận ${item.productSKU}`} value={quantityInput(field.value)} onChangeText={value => field.onChange(parseQuantity(value))}
      onBlur={field.onBlur} error={fieldState.error?.message} editable={!busy} keyboardType="decimal-pad"
      hint="Phần bên giao giữ hoặc mang về, không ghi vào tồn kho. Nhập 0 ở số chấp nhận nếu từ chối toàn bộ." />} />}
    {(correction || legacy) && <Controller control={form.control} name={`lines.${index}.damagedQty`} render={({ field, fieldState }) => <TextField
      label={`Số hỏng ${item.productSKU}`} value={quantityInput(field.value)} onChangeText={value => field.onChange(parseQuantity(value))}
      onBlur={field.onBlur} error={fieldState.error?.message} editable={!busy} keyboardType="decimal-pad" />} />}
    <Controller control={form.control} name={`lines.${index}.exceptionReason`} render={({ field, fieldState }) => <TextField
      label={`Tình trạng hàng ${item.productSKU}`} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
      error={fieldState.error?.message} editable={!busy} multiline maxLength={501} />} />
    {item.isLotTracked && <>
      <Controller control={form.control} name={`lines.${index}.lotNumber`} render={({ field, fieldState }) => <TextField
        label={`Số lô ${item.productSKU}`} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
        error={fieldState.error?.message} editable={!busy && !correction} maxLength={101} autoCapitalize="characters" />} />
      <Controller control={form.control} name={`lines.${index}.manufacturedDate`} render={({ field, fieldState }) => <TextField
        label={`Ngày sản xuất ${item.productSKU}`} placeholder="YYYY-MM-DD" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
        error={fieldState.error?.message} editable={!busy && !correction} maxLength={10} autoCapitalize="none" />} />
      <Controller control={form.control} name={`lines.${index}.expiryDate`} render={({ field, fieldState }) => <TextField
        label={`Hạn sử dụng ${item.productSKU}`} placeholder="YYYY-MM-DD" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
        error={fieldState.error?.message} editable={!busy && !correction} maxLength={10} autoCapitalize="none" />} />
    </>}
    {!correction && <Button label={`Bỏ nhận ${item.productSKU} lần này`} variant="ghost" disabled={busy} onPress={onRemove} />}
  </View>;
});
const styles = StyleSheet.create({ card: { padding: 16, borderWidth: 1, borderRadius: Radius.lg, gap: 12 }, group: { gap: 8 },
  name: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 } });
