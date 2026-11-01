import { CircleCheck, ScanLine } from 'lucide-react-native';
import { useState } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { SelectionField } from '@/components/ui/selection-field';
import { TextField } from '@/components/ui/text-field';
import { WorkDetails } from '@/components/ui/work-details';
import { FontFamily, Radius } from '@/constants/theme';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { useTheme } from '@/hooks/use-theme';
import { formatQuantity } from '@/lib/number-format';
import { conditionSchema, type CustomerReturn, type RestockOptions, type ReturnForm } from '../return-work.schema';
import { conditionSlots, matchesReturnSlot, RETURN_CONDITIONS } from '../return-work';

interface Props {
  readonly line: CustomerReturn['items'][number]; readonly index: number; readonly form: UseFormReturn<ReturnForm>;
  readonly options: RestockOptions | null; readonly disabled: boolean; readonly editable: boolean;
}
export function CustomerReturnLine({ line, index, form, options, disabled, editable }: Props) {
  const theme = useTheme(); const [input, setInput] = useState(''); const [error, setError] = useState<string | null>(null);
  const current = useWatch({ control: form.control, name: `items.${index}` });
  const slots = conditionSlots(options, line.id, current?.condition ?? line.condition);
  const slot = slots.find(item => item.slotId === current?.restockSlotId);
  const verified = current?.condition === 'Scrap' || matchesReturnSlot(current?.scannedSlotCode ?? '', slot);
  function scan(code: string) {
    if (disabled || !editable || !slot) return false;
    if (!matchesReturnSlot(code, slot)) { setError('Mã chưa khớp vị trí đã chọn. Kiểm tra nhãn nơi cất hàng.'); return false; }
    form.setValue(`items.${index}.scannedSlotCode`, code.trim(), { shouldDirty: true, shouldValidate: true });
    setInput(''); setError(null); return true;
  }
  const actualCondition = current?.condition ?? line.actualCondition ?? line.condition;
  return <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
    <Text style={[styles.title, { color: theme.text }]}>{line.productName}</Text>
    <Text style={[styles.meta, { color: theme.textSecondary }]}>{line.sku} · Lô {line.lotNumber || 'không có'}</Text>
    <View style={styles.row}>
      <Text style={[styles.quantity, { color: theme.text }]}>{formatQuantity(line.quantity)} {line.unitName}</Text>
      {editable && verified && <View style={styles.checked}><CircleCheck size={18} color={theme.primary} /><Text style={[styles.meta, { color: theme.primary }]}>Đã kiểm tra</Text></View>}
    </View>
    <Text style={[styles.meta, { color: theme.textSecondary }]}>{RETURN_CONDITIONS[conditionSchema.parse(actualCondition)]}</Text>
    {!editable ? <Text style={[styles.meta, { color: theme.textSecondary }]}>{line.restockLocation || (actualCondition === 'Scrap' ? 'Không nhập lại tồn kho' : 'Vị trí sẽ được kiểm tra khi bắt đầu')}</Text> :
    <WorkDetails title="Kiểm tra tình trạng và vị trí cất" defaultOpen={index === 0}>
      {current?.condition !== 'Scrap' && <ScanCodeButton key={`${current?.condition}:${slot?.slotId ?? ''}`} label={verified ? 'Quét lại mã vị trí' : 'Quét mã vị trí'} title="Quét nơi đã cất hàng"
        renderIcon={color => <ScanLine size={21} color={color} />} disabled={disabled || !slot} showScannedCode={false} status={slot?.path} onScan={scan} />}
      <SelectionField label="Tình trạng thực nhận" value={current?.condition ?? ''} disabled={disabled}
        options={Object.entries(RETURN_CONDITIONS).map(([value, label]) => ({ value, label }))}
        onChange={value => {
          const condition = conditionSchema.parse(value); const candidates = conditionSlots(options, line.id, condition);
          const nextSlot = candidates.find(option => option.isOriginalSlot) ?? candidates[0];
          form.setValue(`items.${index}`, { returnItemId: line.id, condition, restockSlotId: condition === 'Scrap' ? null : nextSlot?.slotId ?? null, scannedSlotCode: null }, { shouldDirty: true, shouldValidate: true });
          setInput(''); setError(null);
        }} />
      {current?.condition !== line.condition && <Text style={[styles.meta, { color: theme.warning }]}>Đã duyệt: {RETURN_CONDITIONS[conditionSchema.parse(line.condition)]}</Text>}
      {current?.condition === 'Scrap' ? <AlertBanner title="Không cộng vào tồn kho" description="Dòng này không cần vị trí cất. Thao tác này không thay thế quy trình tiêu hủy." /> : <>
        <SelectionField label="Vị trí cất hàng" value={current?.restockSlotId ?? ''} disabled={disabled || !slots.length}
          placeholder="Chọn vị trí phù hợp" options={slots.map(option => ({ value: option.slotId, label: option.path,
            description: [option.isOriginalSlot ? 'Vị trí xuất ban đầu' : null, option.availableQuantity !== null ? `Còn nhận ${formatQuantity(option.availableQuantity)}` : null].filter(Boolean).join(' · ') }))}
          onChange={value => { form.setValue(`items.${index}.restockSlotId`, value, { shouldDirty: true });
            form.setValue(`items.${index}.scannedSlotCode`, null, { shouldDirty: true, shouldValidate: true }); setInput(''); setError(null); }} />
        {!slot && <AlertBanner title={slots.length ? 'Chọn lại vị trí trước khi quét' : current?.condition === 'Good' ? 'Chưa có vị trí đủ điều kiện nhận hàng' : 'Chưa có điểm cách ly phù hợp'} description="Tải lại phiếu hoặc nhờ quản lý kiểm tra vị trí và sức chứa." />}
        {slot?.warnings.map(warning => <Text key={warning} style={[styles.meta, { color: theme.warning }]}>{warning}</Text>)}
        <WorkDetails title="Nhập mã thay cho camera">
          <TextField label="Mã vị trí" value={input} onChangeText={setInput} editable={!disabled && !!slot} autoCapitalize="none" autoCorrect={false} maxLength={100}
            onSubmitEditing={() => scan(input)} />
          <Button label="Kiểm tra mã vị trí" variant="outline" disabled={disabled || !slot || !input.trim()} onPress={() => scan(input)} />
        </WorkDetails>
      </>}
      {(error || form.formState.errors.items?.[index]?.scannedSlotCode?.message) && <Text accessibilityRole="alert" style={[styles.meta, { color: theme.error }]}>{error || form.formState.errors.items?.[index]?.scannedSlotCode?.message}</Text>}
    </WorkDetails>}
  </View>;
}
const styles = StyleSheet.create({ card: { padding: 16, gap: 10, borderWidth: 1, borderRadius: Radius.lg },
  title: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 24 }, meta: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 },
  quantity: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 25 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  checked: { flexDirection: 'row', alignItems: 'center', gap: 6 } });
