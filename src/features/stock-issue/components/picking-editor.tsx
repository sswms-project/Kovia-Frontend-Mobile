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

import type { PickForm, StockIssueItem } from '../stock-issue.schema';

interface Props { readonly item: StockIssueItem; readonly slotCode: string; readonly form: UseFormReturn<PickForm>;
  readonly busy: boolean; readonly notice: string | null; readonly onReview: () => void; readonly onClose: () => void }
export function PickingEditor({ item, slotCode, form, busy, notice, onReview, onClose }: Props) {
  const theme = useTheme();
  const [scan, setScan] = useState<'scannedBarcode' | 'scannedSlotCode' | null>(null);
  return <>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Lấy hàng thực tế</Text>
        <Text style={[styles.text, { color: theme.text }]}>{item.sku} · {item.productName}</Text>
        <AlertBanner title={`Nguồn: ${slotCode}`} description="Nhập số thực tế lấy theo đơn vị cơ sở. Chỉ xác nhận sau khi đã di chuyển hàng." />
        {notice && <AlertBanner title={notice} />}
        <Controller control={form.control} name="pickedQuantity" render={({ field, fieldState }) => <TextField label="Số lượng thực tế lấy (đơn vị cơ sở)"
          value={Number.isFinite(field.value) ? String(field.value) : ''} keyboardType="decimal-pad" editable={!busy}
          onChangeText={value => field.onChange(value.trim() ? Number(value.replace(',', '.')) : Number.NaN)}
          onBlur={field.onBlur} error={fieldState.error?.message} />} />
        {(['scannedBarcode', 'scannedSlotCode'] as const).map(name => <Controller key={name} control={form.control} name={name}
          render={({ field, fieldState }) => <TextField label={name === 'scannedBarcode' ? 'Mã sản phẩm' : 'Mã vị trí nguồn'}
            value={field.value ?? ''} autoCapitalize="none" autoCorrect={false} editable={!busy} maxLength={201}
            onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
            labelAccessory={<Button label="Quét" variant="outline" disabled={busy} onPress={() => setScan(name)} />} />} />)}
        <Button label="Kiểm tra và xác nhận lấy hàng" loading={busy} onPress={onReview} />
        <Button label="Đóng nhập lấy hàng" variant="outline" disabled={busy} onPress={onClose} />
      </ScrollView>
    </KeyboardAvoidingView>
    <Modal visible={!!scan} onRequestClose={() => setScan(null)}>
      <SafeAreaView style={styles.root}>{scan && <ScannerScreen title={scan === 'scannedBarcode' ? 'Quét mã sản phẩm' : 'Quét mã vị trí nguồn'}
        onClose={() => setScan(null)} onScan={code => {
          if (scan === 'scannedBarcode' && item.barcode && code.trim().toLowerCase() !== item.barcode.trim().toLowerCase()) return false;
          form.setValue(scan, code, { shouldDirty: true, shouldValidate: true }); setScan(null); return true;
        }} />}</SafeAreaView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 18 },
  title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 }, text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
