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
import { codesMatch } from '@/features/scanner/warehouse-scan';
import { useTheme } from '@/hooks/use-theme';

import type { PickForm, StockIssueItem } from '../stock-issue.schema';
import { canCaptureIssueLocation } from '../stock-issue';

interface Props { readonly item: StockIssueItem; readonly slotCode: string; readonly destinationPath: string; readonly form: UseFormReturn<PickForm>;
  readonly busy: boolean; readonly notice: string | null; readonly onReview: () => void; readonly onClose: () => void }
export function PickingEditor({ item, slotCode, destinationPath, form, busy, notice, onReview, onClose }: Props) {
  const theme = useTheme();
  const close = useModalExit(onClose);
  const quantity = useWatch({ control: form.control, name: 'pickedQuantity' });
  const source = item.pickLocations.find(location => location.inventoryStockId === form.getValues('inventoryStockId'));
  const maximum = Math.min(item.quantity - item.pickedQuantity, source?.reservedQuantity ?? 0);
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <WorkScreenHeader modal title="Lấy hàng thực tế" onBack={close} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Lấy hàng thực tế</Text>
        <Text style={[styles.text, { color: theme.text }]}>{item.sku} · {item.productName}</Text>
        <AlertBanner title={`Nguồn: ${slotCode}`} description="Nhập số thực tế lấy theo đơn vị cơ sở. Hàng chuyển tới khu chờ xuất, vẫn được giữ cho phiếu này. Chỉ xác nhận sau khi đã di chuyển hàng." />
        <AlertBanner title={`Đích chờ xuất: ${destinationPath}`} description="Đưa hàng đến đúng điểm chờ xuất đã được chỉ định. Không bắt buộc quét lại điểm chờ xuất. Nếu bị chặn hoặc đầy, dừng và liên hệ quản lý." />
        {notice && <AlertBanner title={notice} />}
        <Controller control={form.control} name="pickedQuantity" render={({ field, fieldState }) => <TextField label="Số lượng thực tế lấy (đơn vị cơ sở)"
          value={Number.isFinite(field.value) ? String(field.value) : ''} keyboardType="decimal-pad" editable={!busy}
          onChangeText={value => field.onChange(value.trim() ? Number(value.replace(',', '.')) : Number.NaN)}
          onBlur={field.onBlur} error={fieldState.error?.message} />} />
        {(['scannedSlotCode', 'scannedBarcode'] as const).map(name => <Controller key={name} control={form.control} name={name}
          render={({ field, fieldState }) => <TextField label={name === 'scannedBarcode' ? 'Mã sản phẩm' : 'Mã vị trí nguồn'}
            value={field.value ?? ''} autoCapitalize="none" autoCorrect={false} editable={!busy} maxLength={200}
            onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
            labelAccessory={<ScanCodeButton compact label="Quét" title={name === 'scannedBarcode' ? 'Quét mã sản phẩm' : 'Quét mã vị trí nguồn'} disabled={busy}
              onScan={code => {
                if (name === 'scannedBarcode' ? !codesMatch(code, item.barcode || item.sku) : !source || !canCaptureIssueLocation(code, source)) return false;
                field.onChange(code.trim()); return true;
              }} />} />} />)}
        <ScanCountButton title={`Quét đếm ${item.sku}`} quantity={quantity} maximum={maximum} step={item.conversionFactor}
          unitName="đơn vị cơ sở" disabled={busy || !source} matches={code => codesMatch(code, item.barcode || item.sku)}
          onConfirm={(value, code) => {
            form.setValue('pickedQuantity', value, { shouldDirty: true, shouldValidate: true });
            form.setValue('scannedBarcode', code, { shouldDirty: true, shouldValidate: true });
          }} />
        <Button label="Kiểm tra và xác nhận lấy hàng" loading={busy} onPress={onReview} />
        <Button label="Đóng nhập lấy hàng" variant="outline" disabled={busy} onPress={close} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 18 },
  title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 }, text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
