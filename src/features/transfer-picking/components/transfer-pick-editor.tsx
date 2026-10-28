import { WorkScreenHeader } from '@/components/work-screen-header';
import { useModalExit } from '@/hooks/use-screen-exit';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { ScanCountButton } from '@/features/scanner/components/scan-count-button';
import { codesMatch, matchesWarehouseLocation } from '@/features/scanner/warehouse-scan';
import { useTheme } from '@/hooks/use-theme';

import type { TransferPickForm, TransferPickLine } from '../transfer-picking.schema';

interface Props { readonly line: TransferPickLine; readonly slotCode: string; readonly form: UseFormReturn<TransferPickForm>;
  readonly busy: boolean; readonly notice: string | null; readonly onReview: () => void; readonly onClose: () => void }
export function TransferPickEditor({ line, slotCode, form, busy, notice, onReview, onClose }: Props) {
  const theme = useTheme();
  const close = useModalExit(onClose);
  const quantity = useWatch({ control: form.control, name: 'quantity' });
  const source = line.suggestions.find(location => location.inventoryStockId === form.getValues('inventoryStockId'));
  const maximum = Math.min(line.remainingQuantity, source?.suggestedQuantity ?? 0, source?.reservedQuantity ?? 0);
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <WorkScreenHeader modal title="Lấy hàng điều chuyển" onBack={close} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Lấy hàng điều chuyển</Text>
        <Text style={[styles.text, { color: theme.text }]}>{line.sku} · {line.productName}</Text>
        <AlertBanner title={`Vị trí nguồn: ${slotCode}`} description={`Còn cần lấy ${line.remainingQuantity} ${line.baseUnitName}. Nhập số thực tế đã lấy; không điền số kế hoạch nếu chưa lấy hàng.`} />
        {notice && <AlertBanner title={notice} />}
        <Controller control={form.control} name="quantity" render={({ field, fieldState }) => <TextField
          label={`Số lượng thực tế lấy (${line.baseUnitName})`} keyboardType="decimal-pad" editable={!busy}
          value={Number.isFinite(field.value) ? String(field.value) : ''}
          onChangeText={value => field.onChange(value.trim() ? Number(value.replace(',', '.')) : Number.NaN)}
          onBlur={field.onBlur} error={fieldState.error?.message} />} />
        {(['scannedSlotCode', 'scannedProductCode'] as const).map(name => <Controller key={name} control={form.control} name={name}
          render={({ field, fieldState }) => <TextField label={name === 'scannedProductCode' ? 'Mã sản phẩm' : 'Mã vị trí nguồn'}
            value={field.value} editable={!busy} autoCapitalize="none" autoCorrect={false} maxLength={100}
            onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
            labelAccessory={<ScanCodeButton compact label="Quét" title={name === 'scannedProductCode' ? 'Quét mã sản phẩm' : 'Quét mã vị trí nguồn'} disabled={busy}
              onScan={code => {
                if (name === 'scannedProductCode' ? !codesMatch(code, line.sku, line.productBarcode) : !source || !matchesWarehouseLocation(code, source)) return false;
                field.onChange(code.trim()); return true;
              }} />} />} />)}
        <ScanCountButton title={`Quét đếm ${line.sku}`} quantity={quantity} maximum={maximum} unitName={line.baseUnitName}
          disabled={busy || !source} matches={code => codesMatch(code, line.sku, line.productBarcode)} onConfirm={(value, code) => {
            form.setValue('quantity', value, { shouldDirty: true, shouldValidate: true });
            form.setValue('scannedProductCode', code, { shouldDirty: true, shouldValidate: true });
          }} />
        <Button label="Kiểm tra lấy hàng" loading={busy} onPress={onReview} />
        <Button label="Đóng nhập lấy hàng" variant="outline" disabled={busy} onPress={close} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 18 },
  title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 }, text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
