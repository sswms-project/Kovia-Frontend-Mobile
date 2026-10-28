import { memo, useRef, useState } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
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
  const [expanded, setExpanded] = useState(true);
  const sku = item.productSKU;
  const receivedQty = useWatch({ control: form.control, name: `lines.${index}.receivedQty` });
  const baseQty = Number.isFinite(receivedQty) ? receivedQty : 0;
  // Scans in the open session stay pending until the worker confirms them; the ref keeps rapid scans from reading a stale count.
  const [scanned, setScanned] = useState(0);
  const scanCount = useRef(0);
  function setScanCount(value: number) { scanCount.current = value; setScanned(value); }
  const units = item.enteredUnitId === item.baseUnitId ? [{ id: item.baseUnitId, name: item.baseUnitName }]
    : [{ id: item.baseUnitId, name: item.baseUnitName }, { id: item.enteredUnitId, name: item.enteredUnitName }];
  const unitName = useWatch({ control: form.control, name: `lines.${index}.enteredUnitId` }) === item.enteredUnitId ? item.enteredUnitName : item.baseUnitName;
  return <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
    <View style={styles.header}>
      <Pressable style={styles.headerText} accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Thu gọn' : 'Mở chi tiết'} nhận ${sku}`}
        accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}>
        <Text style={[styles.sku, { color: theme.textSecondary }]}>{sku}</Text>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{item.productName}</Text>
        <Text style={[styles.text, { color: theme.primary }]}>{expanded ? 'Thu gọn ▴' : 'Mở chi tiết ▾'}</Text>
      </Pressable>
      {expanded && !correction && <ScanCodeButton compact continuous label={baseQty > 0 ? `Quét đếm · ${baseQty}` : 'Quét đếm'}
        title={`Quét mã ${sku}`} status={`Đã quét: ${scanned} ${unitName} · Số lượng thực nhận sau xác nhận: ${baseQty + scanned}`} disabled={busy}
        onOpen={() => setScanCount(0)}
        onScan={code => {
          if (code.trim().toLowerCase() !== sku.trim().toLowerCase()) return false;
          setScanCount(scanCount.current + 1);
          return true;
        }}
        confirm={{ label: scanned > 0 ? `Xác nhận ${scanned} ${unitName}` : 'Xác nhận', disabled: scanned === 0, onPress: () => {
          form.setValue(`lines.${index}.receivedQty`, baseQty + scanCount.current, { shouldDirty: true, shouldValidate: true });
          setScanCount(0);
        } }}
        onBeforeClose={() => scanCount.current === 0 || new Promise<boolean>(resolve => Alert.alert('Bỏ lượt quét?',
          `${scanCount.current} ${unitName} đã quét chưa được xác nhận sẽ không được cộng vào Số lượng thực nhận.`,
          [{ text: 'Quét tiếp', style: 'cancel', onPress: () => resolve(false) }, { text: 'Bỏ', style: 'destructive', onPress: () => { setScanCount(0); resolve(true); } }],
          { cancelable: true, onDismiss: () => resolve(false) }))} />}
    </View>
    {!correction && <Text style={[styles.text, { color: theme.textSecondary }]}>Còn được nhận: {`${item.remainingQuantity}\u00a0${item.baseUnitName.replace(/ /g, '\u00a0')}`}</Text>}
    {expanded && <>
    {units.length > 1 && <Controller control={form.control} name={`lines.${index}.enteredUnitId`} render={({ field }) =>
      <View accessibilityRole="radiogroup" accessibilityLabel={`Đơn vị nhận ${sku}`} style={[styles.segment, { borderColor: theme.border }]}>
        {units.map(unit => { const active = field.value === unit.id; return <Pressable key={unit.id} accessibilityRole="radio"
          accessibilityState={{ selected: active, disabled: busy || correction }} disabled={busy || correction}
          onPress={() => { if (active) return; field.onChange(unit.id); form.setValue(`lines.${index}.receivedQty`, Number.NaN); form.setValue(`lines.${index}.damagedQty`, 0); }}
          style={[styles.segmentItem, active && { backgroundColor: theme.primary }, (busy || correction) && styles.inactive]}>
          <Text style={[styles.segmentLabel, { color: active ? theme.onPrimary : theme.text }]}>{unit.name}</Text>
        </Pressable>; })}
      </View>} />}
    <View style={styles.quantityGroup}>
    <View style={styles.row}>
      <Text style={[styles.quantityLabel, { color: theme.text }]}>{`Số lượng thực nhận (${unitName})`}</Text>
      <Text style={[styles.quantityLabel, { color: theme.text }]}>{`${correction || legacy ? 'Hỏng' : 'Từ chối'} (${unitName})`}</Text>
    </View>
    <View style={styles.row}>
      <View style={styles.cell}><Controller control={form.control} name={`lines.${index}.receivedQty`} render={({ field, fieldState }) => <TextField
        hideLabel label={`Số lượng thực nhận (${unitName})`} accessibilityLabel={`Số lượng thực nhận ${sku}`}
        value={quantityInput(field.value)} onChangeText={value => field.onChange(parseQuantity(value))} placeholder="0"
        onBlur={field.onBlur} error={fieldState.error?.message} editable={!busy && !correction} keyboardType="decimal-pad" />} /></View>
      {!correction && !legacy && <View style={styles.cell}><Controller control={form.control} name={`lines.${index}.rejectedQty`} render={({ field, fieldState }) => <TextField
        hideLabel label={`Từ chối (${unitName})`} accessibilityLabel={`Số từ chối trước nhận ${sku}`} value={quantityInput(field.value)} placeholder="0"
        onChangeText={value => field.onChange(parseQuantity(value))} onBlur={field.onBlur} error={fieldState.error?.message} editable={!busy} keyboardType="decimal-pad" />} /></View>}
      {(correction || legacy) && <View style={styles.cell}><Controller control={form.control} name={`lines.${index}.damagedQty`} render={({ field, fieldState }) => <TextField
        hideLabel label={`Hỏng (${unitName})`} accessibilityLabel={`Số hỏng ${sku}`} value={quantityInput(field.value)} placeholder="0"
        onChangeText={value => field.onChange(parseQuantity(value))} onBlur={field.onBlur} error={fieldState.error?.message} editable={!busy} keyboardType="decimal-pad" />} /></View>}
    </View>
    </View>
    <Text style={[styles.hint, { color: theme.textSecondary }]}>{correction ? 'Hàng đã nhận được giữ nguyên; chỉ sửa phân loại.'
      : legacy ? 'Nhập số đã kiểm đếm thực tế theo đơn vị đang chọn.' : 'Từ chối: phần bên giao mang về, không vào tồn kho. Từ chối toàn bộ thì nhập 0 ở Số lượng thực nhận.'}</Text>
    {item.isLotTracked && <>
      <Controller control={form.control} name={`lines.${index}.lotNumber`} render={({ field, fieldState }) => <TextField
        label="Số lô" accessibilityLabel={`Số lô ${sku}`} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
        error={fieldState.error?.message} editable={!busy && !correction} maxLength={101} autoCapitalize="characters"
        labelAccessory={!correction && <ScanCodeButton compact label="Quét số lô" title="Quét số lô" disabled={busy}
          onScan={code => { const lot = code.trim(); if (!lot || lot.length > 100) return false; field.onChange(lot.toUpperCase()); return true; }} />} />} />
      <View style={styles.row}>
        <View style={styles.cell}><Controller control={form.control} name={`lines.${index}.manufacturedDate`} render={({ field, fieldState }) => <TextField
          label="Ngày SX" accessibilityLabel={`Ngày sản xuất ${sku}`} placeholder="YYYY-MM-DD" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          error={fieldState.error?.message} editable={!busy && !correction} maxLength={10} autoCapitalize="none" />} /></View>
        <View style={styles.cell}><Controller control={form.control} name={`lines.${index}.expiryDate`} render={({ field, fieldState }) => <TextField
          label="Hạn dùng" accessibilityLabel={`Hạn sử dụng ${sku}`} placeholder="YYYY-MM-DD" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          error={fieldState.error?.message} editable={!busy && !correction} maxLength={10} autoCapitalize="none" />} /></View>
      </View>
    </>}
    <Controller control={form.control} name={`lines.${index}.exceptionReason`} render={({ field, fieldState }) => <TextField
      label="Tình trạng hàng" accessibilityLabel={`Tình trạng hàng ${sku}`} placeholder="Móp, rách bao bì, sai quy cách… (nếu có)"
      value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} editable={!busy} multiline maxLength={501} />} />
    {!correction && <Button label="Bỏ dòng này" accessibilityLabel={`Bỏ nhận ${sku} lần này`} variant="ghost" disabled={busy} onPress={onRemove} />}
    </>}
  </View>;
});
const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderRadius: Radius.lg, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1, gap: 2, minHeight: 44 },
  sku: { fontFamily: FontFamily.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
  name: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 22 },
  text: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.md, padding: 3, gap: 3 },
  segmentItem: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.base },
  segmentLabel: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  inactive: { opacity: 0.5 },
  row: { flexDirection: 'row', gap: 12 },
  quantityGroup: { gap: 6 },
  quantityLabel: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 13, lineHeight: 19 },
  cell: { flex: 1 },
  hint: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17, marginTop: -4 },
});
