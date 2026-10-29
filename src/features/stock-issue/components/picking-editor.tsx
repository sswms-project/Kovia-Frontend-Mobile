import { Minus, Plus, ScanLine } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, type TextInput } from 'react-native';
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
  const scrollRef = useRef<ScrollView>(null);
  const quantityOffset = useRef(0);
  const scan = usePickingScan(item, form, busy);
  useEffect(() => {
    if (busy || cameraOpen) return;
    if (!scan.sourceReady) { if (scan.hardware) sourceInputRef.current?.focus(); }
    else if (!scan.ready || scan.eachUnit) productInputRef.current?.focus();
    else { scrollRef.current?.scrollTo({ y: Math.max(0, quantityOffset.current - 48), animated: true }); quantityInputRef.current?.focus(); }
  }, [busy, cameraOpen, scan.sourceReady, scan.ready, scan.eachUnit, scan.hardware]);
  const maximum = `${formatQuantity(scan.maximum / scan.factor)} ${item.enteredUnitName}`;
  const stage = !scan.sourceReady ? '1. Quét vị trí nguồn' : !scan.ready ? '2. Quét mã hàng' : '3. Kiểm tra số lượng';
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <WorkScreenHeader modal title="Quét & lấy hàng" onBack={close} />
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sku, { color: theme.textSecondary }]}>{item.sku}</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{item.productName}</Text>
        <Text style={[styles.text, { color: theme.text }]}>Lấy tại: {sourcePath}</Text>
        <Text style={[styles.emphasis, { color: theme.primary }]}>Còn được lấy {maximum}</Text>
        {!!scan.source?.lotNumber && <Text style={[styles.text, { color: theme.textSecondary }]}>Lô {scan.source.lotNumber} · HSD {scan.source.expiryDate ?? 'Không có'}</Text>}
        <Text style={[styles.text, { color: theme.textSecondary }]}>Đưa tới: {destinationPath}</Text>
      </View>
      <Text accessibilityLiveRegion="polite" style={[styles.emphasis, { color: theme.primary }]}>{stage}</Text>
      <ScanCodeButton continuous label={scan.ready && !scan.eachUnit ? 'Quét lại vị trí và mã hàng' : 'Quét vị trí và mã hàng'} title={stage} disabled={busy || !scan.source || scan.maximum <= 0}
        showScannedCode={false}
        closeAfterScan={() => !scan.eachUnit && !!form.getValues('scannedSlotCode') && !!form.getValues('scannedBarcode')}
        renderIcon={color => <ScanLine size={22} color={color} />}
        status={`${item.sku} · ${stage} · Tối đa ${maximum}${scan.ready ? ` · Đã ghi nhận ${scan.quantityText} ${item.enteredUnitName}` : ''}${scan.error ? ` · ${scan.error}` : ''}`}
        onOpen={() => { if (scan.ready && !scan.eachUnit) scan.reset(); setCameraOpen(true); }} onClose={() => setCameraOpen(false)}
        onScan={scan.scan} confirm={scan.eachUnit ? { label: 'Kiểm tra số lượng', disabled: !scan.ready, onPress: () => {} } : undefined} />
      <Text style={[styles.hint, { color: theme.textSecondary }]}>{scan.eachUnit ? `Giữ camera để quét đếm từng ${item.enteredUnitName}; bấm Kiểm tra số lượng khi xong.` : 'Quét vị trí rồi mã hàng. Camera tự đóng khi quét đủ để bạn kiểm tra số lượng.'}</Text>
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
      {scan.ready && <AlertBanner variant="success" title="Đã quét đúng sản phẩm" />}
      <Text style={[styles.emphasis, { color: theme.text }]}>3. Số lượng lấy ({item.enteredUnitName})</Text>
      <View style={styles.quantityRow} onLayout={event => { quantityOffset.current = event.nativeEvent.layout.y; }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Giảm 1 ${item.enteredUnitName}`} accessibilityState={{ disabled: !scan.canDecrease }}
          disabled={!scan.canDecrease} onPress={() => scan.adjustQuantity(-1)} style={[styles.step, { borderColor: theme.border, backgroundColor: theme.card }, !scan.canDecrease && styles.inactive]}>
          <Minus size={22} color={theme.primary} />
        </Pressable>
        <View style={styles.quantityField}><TextField hideLabel label={`3. Số lượng lấy (${item.enteredUnitName})`} value={scan.quantityText} onChangeText={scan.changeQuantity}
          inputRef={quantityInputRef} selectTextOnFocus showSoftInputOnFocus={!scan.hardware} editable={!busy && scan.ready} keyboardType={scan.factor !== 1 ? 'number-pad' : 'decimal-pad'} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Tăng 1 ${item.enteredUnitName}`} accessibilityState={{ disabled: !scan.canIncrease }}
          disabled={!scan.canIncrease} onPress={() => scan.adjustQuantity(1)} style={[styles.step, { borderColor: theme.border, backgroundColor: theme.card }, !scan.canIncrease && styles.inactive]}>
          <Plus size={22} color={theme.primary} />
        </Pressable>
      </View>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>Tối đa {maximum}. Mỗi nút +/− thay đổi 1 {item.enteredUnitName}.</Text>
      {!!(scan.quantityError ?? form.formState.errors.pickedQuantity?.message) && <Text accessibilityRole="alert" style={[styles.hint, { color: theme.error }]}>{scan.quantityError ?? form.formState.errors.pickedQuantity?.message}</Text>}
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
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, quantityField: { flex: 1, minWidth: 0 },
  step: { width: 48, height: 52, borderWidth: 1, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' }, inactive: { opacity: 0.45 },
  option: { flexDirection: 'row', gap: 12, alignItems: 'center' }, optionLabel: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 } });
