import { useState } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { ScannerScreen } from '@/features/scanner/screens/scanner-screen';
import { useTheme } from '@/hooks/use-theme';

import type { TransferPickForm, TransferPickLine } from '../transfer-picking.schema';

interface Props { readonly line: TransferPickLine; readonly slotCode: string; readonly form: UseFormReturn<TransferPickForm>;
  readonly busy: boolean; readonly notice: string | null; readonly onReview: () => void; readonly onClose: () => void }
export function TransferPickEditor({ line, slotCode, form, busy, notice, onReview, onClose }: Props) {
  const theme = useTheme();
  const [scan, setScan] = useState<'scannedProductCode' | 'scannedSlotCode' | null>(null);
  return <>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
        {(['scannedProductCode', 'scannedSlotCode'] as const).map(name => <Controller key={name} control={form.control} name={name}
          render={({ field, fieldState }) => <TextField label={name === 'scannedProductCode' ? 'Mã sản phẩm' : 'Mã vị trí nguồn'}
            value={field.value} editable={!busy} autoCapitalize="none" autoCorrect={false} maxLength={101}
            onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
            labelAccessory={<Button label="Quét" variant="outline" disabled={busy} onPress={() => setScan(name)} />} />} />)}
        <Button label="Kiểm tra lấy hàng" loading={busy} onPress={onReview} />
        <Button label="Đóng nhập lấy hàng" variant="outline" disabled={busy} onPress={onClose} />
      </ScrollView>
    </KeyboardAvoidingView>
    <Modal visible={!!scan} onRequestClose={() => setScan(null)}>
      <SafeAreaView style={styles.root}>{scan && <ScannerScreen title={scan === 'scannedProductCode' ? 'Quét mã sản phẩm' : 'Quét mã vị trí nguồn'}
        onClose={() => setScan(null)} onScan={code => {
          if (scan === 'scannedProductCode' && ![line.sku, line.productBarcode].some(value => value?.trim().toLowerCase() === code.trim().toLowerCase())) return false;
          form.setValue(scan, code, { shouldDirty: true, shouldValidate: true }); setScan(null); return true;
        }} />}</SafeAreaView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 18 },
  title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 }, text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
