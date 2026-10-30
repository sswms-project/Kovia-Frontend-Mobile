import { Minus, Plus, ScanLine } from 'lucide-react-native';
import { WorkScreenHeader } from '@/components/work-screen-header';
import { WorkActionBar } from '@/components/work-action-bar';
import { useModalExit } from '@/hooks/use-screen-exit';
import { useEffect, useRef, useState } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, type TextInput } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { useTransferPickScan } from '../hooks/use-transfer-pick-scan';
import { formatInventoryLocation } from '@/features/inventory/inventory.labels';
import { useTheme } from '@/hooks/use-theme';

import type { TransferPickForm, TransferPickLine } from '../transfer-picking.schema';

interface Props { readonly line: TransferPickLine; readonly slotCode: string; readonly form: UseFormReturn<TransferPickForm>;
  readonly busy: boolean; readonly submitDisabled?: boolean; readonly notice: string | null; readonly onReview: () => void; readonly onClose: () => void }
export function TransferPickEditor({ line, slotCode, form, busy, submitDisabled = false, notice, onReview, onClose }: Props) {
  const theme = useTheme();
  const close = useModalExit(onClose);
  const scan = useTransferPickScan(line, form, busy || submitDisabled);
  const [cameraOpen, setCameraOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null), quantityOffset = useRef(0);
  const sourceRef = useRef<TextInput>(null), productRef = useRef<TextInput>(null), quantityRef = useRef<TextInput>(null);
  useEffect(() => {
    if (busy || cameraOpen) return;
    if (!scan.sourceReady) { if (scan.hardware) sourceRef.current?.focus(); }
    else if (!scan.ready || scan.eachUnit) productRef.current?.focus();
    else { scrollRef.current?.scrollTo({ y: Math.max(0, quantityOffset.current - 48), animated: true }); quantityRef.current?.focus(); }
  }, [busy, cameraOpen, scan.sourceReady, scan.ready, scan.eachUnit, scan.hardware]);
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <WorkScreenHeader modal title="Lấy hàng điều chuyển" onBack={close} />
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{line.productName}</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>{line.sku}</Text>
        <AlertBanner title={`Vị trí nguồn: ${scan.source ? formatInventoryLocation(scan.source) : slotCode}`} description={`Còn cần lấy ${line.remainingQuantity} ${line.baseUnitName}. Nhập số thực tế đã lấy; không điền số kế hoạch nếu chưa lấy hàng.`} />
        {notice && <AlertBanner title={notice} />}
        <ScanCodeButton renderIcon={color => <ScanLine size={20} color={color} />} continuous label={scan.ready && !scan.eachUnit ? 'Quét lại vị trí và mã hàng' : 'Quét vị trí và mã hàng'}
          title={!scan.sourceReady ? '1. Quét vị trí nguồn' : '2. Quét sản phẩm'} showScannedCode={false} disabled={busy || !scan.source || scan.maximum <= 0}
          onOpen={() => { if (scan.ready && !scan.eachUnit) scan.reset(); setCameraOpen(true); }} onClose={() => setCameraOpen(false)}
          closeAfterScan={() => !scan.eachUnit && !!form.getValues('scannedSlotCode') && !!form.getValues('scannedProductCode')}
          onScan={scan.scan} status={scan.error ?? (scan.ready ? 'Đã quét đúng sản phẩm. Kiểm tra số lượng thực lấy.' : 'Quét vị trí nguồn rồi quét mã sản phẩm.')}
          confirm={scan.eachUnit ? { label: 'Kiểm tra số lượng', disabled: !scan.ready, onPress: () => {} } : undefined} />
        <View style={styles.option}><Text style={[styles.label, { color: theme.text }]}>Dùng máy quét cầm tay</Text><Switch accessibilityLabel="Dùng máy quét cầm tay" value={scan.hardware} disabled={busy} onValueChange={scan.changeHardware} /></View>
        <View style={styles.option}><Text style={[styles.label, { color: theme.text }]}>Quét từng {line.baseUnitName}</Text><Switch accessibilityLabel="Quét từng đơn vị" value={scan.eachUnit} disabled={busy} onValueChange={scan.changeEachUnit} /></View>
        <TextField label="1. Mã vị trí nguồn" value={scan.sourceText} inputRef={sourceRef} editable={!busy} autoCapitalize="none" autoCorrect={false}
          maxLength={100} showSoftInputOnFocus={!scan.hardware} onChangeText={scan.changeSource} onSubmitEditing={() => scan.scanSource(scan.sourceText)}
          labelAccessory={<Button label="Kiểm tra" variant="ghost" disabled={busy || !scan.sourceText.trim()} onPress={() => scan.scanSource(scan.sourceText)} />} />
        {scan.sourceReady && <AlertBanner variant="success" title="Đã xác nhận vị trí nguồn" />}
        <TextField label="2. Mã sản phẩm" value={scan.productText} inputRef={productRef} editable={!busy && scan.sourceReady} autoCapitalize="none" autoCorrect={false}
          maxLength={100} showSoftInputOnFocus={!scan.hardware} onChangeText={scan.changeProduct} onSubmitEditing={() => scan.scanProduct(scan.productText)}
          labelAccessory={<Button label="Kiểm tra" variant="ghost" disabled={busy || !scan.sourceReady || !scan.productText.trim()} onPress={() => scan.scanProduct(scan.productText)} />} />
        {scan.ready && <AlertBanner variant="success" title="Đã quét đúng sản phẩm" />}
        <Text style={[styles.label, { color: theme.text }]}>3. Số lượng thực lấy ({line.baseUnitName})</Text>
        <View style={styles.quantityRow} onLayout={event => { quantityOffset.current = event.nativeEvent.layout.y; }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Giảm 1 ${line.baseUnitName}`} accessibilityState={{ disabled: !scan.canDecrease }}
            disabled={!scan.canDecrease} onPress={() => scan.adjustQuantity(-1)}
            style={[styles.step, { borderColor: theme.border, backgroundColor: theme.card }, !scan.canDecrease && styles.inactive]}>
            <Minus size={22} color={theme.primary} />
          </Pressable>
          <View style={styles.quantityField}><Controller control={form.control} name="quantity" render={({ field, fieldState }) => <TextField
          hideLabel label={`3. Số lượng thực lấy (${line.baseUnitName})`} keyboardType={line.baseQuantityPrecision === 0 ? 'number-pad' : 'decimal-pad'} editable={!busy && !submitDisabled && scan.ready}
          inputRef={quantityRef} selectTextOnFocus showSoftInputOnFocus={!scan.hardware} value={Number.isFinite(field.value) ? String(field.value) : ''}
          onChangeText={value => field.onChange(value.trim() ? Number(value.replace(',', '.')) : Number.NaN)}
          onBlur={field.onBlur} error={fieldState.error?.message} />} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Tăng 1 ${line.baseUnitName}`} accessibilityState={{ disabled: !scan.canIncrease }}
            disabled={!scan.canIncrease} onPress={() => scan.adjustQuantity(1)}
            style={[styles.step, { borderColor: theme.border, backgroundColor: theme.card }, !scan.canIncrease && styles.inactive]}>
            <Plus size={22} color={theme.primary} />
          </Pressable>
        </View>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Tối đa {scan.maximum} {line.baseUnitName}. Mỗi nút +/− thay đổi 1 {line.baseUnitName}.</Text>
        {scan.error && <AlertBanner variant="destructive" title={scan.error} />}
        <Button label="Quét lại từ đầu" variant="outline" disabled={busy} onPress={scan.reset} />
      </ScrollView>
      <WorkActionBar hint={`Tối đa ${scan.maximum} ${line.baseUnitName} tại nguồn đã chọn.`}>
        <Button label="Kiểm tra lấy hàng" loading={busy} disabled={submitDisabled || !scan.ready || !!scan.error} onPress={onReview} />
      </WorkActionBar>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 18 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, quantityField: { flex: 1, minWidth: 0 },
  step: { width: 48, height: 52, borderWidth: 1, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' }, inactive: { opacity: 0.45 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12 }, label: { flex: 1, fontFamily: FontFamily.regular, fontSize: 15 },
  title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 }, text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 } });
