import { ScanLine } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View, type TextInput } from 'react-native';
import type { UseFormReturn } from 'react-hook-form';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { WorkScreenHeader } from '@/components/work-screen-header';
import { WorkActionBar } from '@/components/work-action-bar';
import { FontFamily, Radius } from '@/constants/theme';
import { formatQuantity } from '@/lib/number-format';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { useModalExit } from '@/hooks/use-screen-exit';
import { useTheme } from '@/hooks/use-theme';
import { usePickingScan } from '../hooks/use-picking-scan';
import type { PickForm, StockIssueItem } from '../stock-issue.schema';

interface Props {
  readonly item: StockIssueItem; readonly sourcePath: string; readonly destinationPath: string; readonly form: UseFormReturn<PickForm>;
  readonly busy: boolean; readonly notice: string | null; readonly onReview: () => void; readonly onClose: () => void;
}
export function PickingEditor({ item, sourcePath, destinationPath, form, busy, notice, onReview, onClose }: Props) {
  const theme = useTheme();
  const close = useModalExit(onClose);
  const [cameraOpen, setCameraOpen] = useState(false);
  const sourceInputRef = useRef<TextInput>(null);
  const productInputRef = useRef<TextInput>(null);
  const quantityInputRef = useRef<TextInput>(null);
  const scan = usePickingScan(item, form, busy);
  useEffect(() => {
    if (busy || cameraOpen) return;
    if (!scan.sourceReady) { if (scan.hardware) sourceInputRef.current?.focus(); }
    else if (!scan.ready || scan.eachUnit) productInputRef.current?.focus();
    else if (!scan.hardware) quantityInputRef.current?.focus();
  }, [busy, cameraOpen, scan.sourceReady, scan.ready, scan.eachUnit, scan.hardware]);
  const maximum = `${formatQuantity(scan.maximum / scan.factor)} ${item.enteredUnitName}`;
  const stage = !scan.sourceReady ? '1. Quét vị trí nguồn' : !scan.ready ? '2. Quét mã hàng' : '3. Kiểm tra số lượng';
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <WorkScreenHeader modal title="Quét & lấy hàng" onBack={close} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sku, { color: theme.textSecondary }]}>{item.sku}</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{item.productName}</Text>
        <Text style={[styles.text, { color: theme.text }]}>Lấy tại: {sourcePath}</Text>
        <Text style={[styles.emphasis, { color: theme.primary }]}>Còn được lấy {maximum}</Text>
        {!!scan.source?.lotNumber && <Text style={[styles.text, { color: theme.textSecondary }]}>Lô {scan.source.lotNumber} · HSD {scan.source.expiryDate ?? 'Không có'}</Text>}
        <Text style={[styles.text, { color: theme.textSecondary }]}>Đưa tới: {destinationPath}</Text>
      </View>
      <Text accessibilityLiveRegion="polite" style={[styles.emphasis, { color: theme.primary }]}>{stage}</Text>
      <ScanCodeButton continuous label="Quét vị trí và mã hàng" title={stage} disabled={busy || !scan.source || scan.maximum <= 0}
        renderIcon={color => <ScanLine size={22} color={color} />}
        status={`${item.sku} · ${stage} · Tối đa ${maximum}${scan.ready ? ` · Đã ghi nhận ${scan.quantityText} ${item.enteredUnitName}` : ''}${scan.error ? ` · ${scan.error}` : ''}`}
        onOpen={() => setCameraOpen(true)} onBeforeClose={() => { setCameraOpen(false); return true; }}
        onScan={scan.scan} confirm={{ label: 'Kiểm tra số lượng', disabled: !scan.ready, onPress: () => setCameraOpen(false) }} />
      <Text style={[styles.hint, { color: theme.textSecondary }]}>Giữ camera mở để quét vị trí rồi mã hàng. Sau đó kiểm tra số lượng thực tế.</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.option}><Text style={[styles.optionLabel, { color: theme.text }]}>Dùng máy quét, ẩn bàn phím</Text>
          <Switch accessibilityLabel="Dùng máy quét, ẩn bàn phím" value={scan.hardware} disabled={busy} onValueChange={scan.changeHardware} /></View>
        <View style={styles.option}><Text style={[styles.optionLabel, { color: theme.text }]}>Quét từng {item.enteredUnitName}</Text>
          <Switch accessibilityLabel={`Quét từng ${item.enteredUnitName}`} value={scan.eachUnit} disabled={busy} onValueChange={scan.changeEachUnit} /></View>
      </View>
      <TextField label="1. Quét mã vị trí" placeholder="Quét hoặc nhập mã rồi nhấn Enter" value={scan.sourceInput}
        inputRef={sourceInputRef}
        onChangeText={scan.changeSource} editable={!busy} showSoftInputOnFocus={!scan.hardware} autoCapitalize="none" autoCorrect={false} maxLength={200}
        returnKeyType="done" onSubmitEditing={() => { scan.scanSource(scan.sourceInput); }} />
      {!scan.sourceReady && <Button label="Kiểm tra mã vị trí" variant="outline" disabled={busy || !scan.sourceInput.trim()} onPress={() => { scan.scanSource(scan.sourceInput); }} />}
      {scan.sourceReady && <AlertBanner variant={scan.sourceVerified ? 'success' : 'default'} title={scan.sourceVerified ? 'Đã quét đúng vị trí' : 'Đã nhận mã QR kệ'}
        description={scan.sourceVerified ? sourcePath : `${sourcePath}. Kiểm tra đúng kệ trước khi xác nhận; máy chủ sẽ xác minh mã khi ghi nhận lượt lấy.`} />}
      <TextField label="2. Quét mã hàng" placeholder={scan.sourceReady ? 'Quét mã vạch hoặc nhập mã hàng' : 'Quét vị trí nguồn trước'} value={scan.productInput}
        inputRef={productInputRef}
        onChangeText={scan.changeProduct} editable={!busy && scan.sourceReady} showSoftInputOnFocus={!scan.hardware} autoCapitalize="none" autoCorrect={false}
        maxLength={200} returnKeyType="done" onSubmitEditing={() => { scan.scanProduct(scan.productInput); }} />
      {scan.sourceReady && !scan.ready && <Button label="Kiểm tra mã hàng" variant="outline" disabled={busy || !scan.productInput.trim()} onPress={() => { scan.scanProduct(scan.productInput); }} />}
      {scan.ready && <AlertBanner variant="success" title="Đã quét đúng mã hàng" description={`${form.getValues('scannedBarcode')} · ${scan.eachUnit ? `Mỗi lượt cộng 1 ${item.enteredUnitName}.` : 'Kiểm tra số lượng thực tế trước khi xác nhận.'}`} />}
      <TextField label={`3. Số lượng lấy (${item.enteredUnitName})`} value={scan.quantityText} onChangeText={scan.changeQuantity}
        inputRef={quantityInputRef}
        editable={!busy && scan.ready} keyboardType={scan.factor !== 1 ? 'number-pad' : 'decimal-pad'}
        hint={`Tối đa ${maximum}. Lấy thiếu thì nhập số thực tế.`} error={scan.quantityError ?? form.formState.errors.pickedQuantity?.message} />
      {scan.factor !== 1 && <Text style={[styles.hint, { color: theme.textSecondary }]}>1 {item.enteredUnitName} = {formatQuantity(scan.factor)} đơn vị cơ sở</Text>}
      {scan.error && <AlertBanner variant="destructive" title={scan.error} />}
      {notice && <AlertBanner title={notice} />}
      <Button label="Quét lại từ đầu" variant="outline" disabled={busy} onPress={scan.reset} />
    </ScrollView>
    <WorkActionBar hint="Chỉ xác nhận sau khi đã đưa hàng tới điểm chờ xuất. Lấy hàng chưa phải xuất kho.">
      <Button label="Kiểm tra và xác nhận lượt lấy" disabled={!scan.canReview} loading={busy} onPress={onReview} />
    </WorkActionBar>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 16, gap: 16 },
  card: { padding: 16, gap: 10, borderWidth: 1, borderRadius: Radius.lg }, title: { fontFamily: FontFamily.bold, fontSize: 22, lineHeight: 30 },
  sku: { fontFamily: FontFamily.mono, fontSize: 13 }, text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 },
  emphasis: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 }, hint: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 20 },
  option: { flexDirection: 'row', gap: 12, alignItems: 'center' }, optionLabel: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 } });
