import { WorkScreenHeader } from '@/components/work-screen-header';
import { useModalExit } from '@/hooks/use-screen-exit';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { ScannerScreen } from '@/features/scanner/screens/scanner-screen';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import type { useRelocation } from '../hooks/use-relocation';
import { matchesRelocationSlot } from '../relocation';

interface Props { readonly state: ReturnType<typeof useRelocation> }
export function RelocationEditor({ state }: Props) {
  const theme = useTheme();
  const close = useModalExit(state.closeEditor);
  const [scan, setScan] = useState<'sourceScan' | 'destinationScan' | 'productScan' | null>(null);
  const line = state.activeEditor?.line;
  const busy = state.mutation.isPending;
  const source = state.source.isSuccess ? state.source.data : undefined;
  if (!line) return null;
  const scans = [{ name: 'productScan', label: 'Mã sản phẩm' }, { name: 'sourceScan', label: 'Mã vị trí nguồn' },
    { name: 'destinationScan', label: 'Mã vị trí đích' }] as const;
  return <>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <WorkScreenHeader modal title="Di chuyển hàng" onBack={close} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Ghi nhận chuyển vị trí</Text>
        <Text style={[styles.text, { color: theme.text }]}>{line.sku} · {line.productName}</Text>
        <AlertBanner title={`Nguồn: ${line.sourceSlotCode}`} description={`Còn ${line.remainingQuantity} đơn vị cơ sở cần chuyển. Chỉ xác nhận số đã thực tế chuyển; tổng tồn của kho không đổi.`} />
        {state.source.isPending && <AlertBanner title="Đang xác minh tồn nguồn và đơn vị…" />}
        {state.source.error && <AlertBanner title="Chưa xác minh được tồn nguồn" description={getApiErrorMessage(state.source.error)}>
          <Button label="Tải lại tồn nguồn" variant="outline" disabled={busy || state.source.isFetching} onPress={() => { void state.source.refetch(); }} />
        </AlertBanner>}
        {source && <AlertBanner title={`Đơn vị cơ sở: ${source.unit.unitName}`} description={`Lô: ${source.stock.lotNumber ?? 'Không theo lô'} · Hạn: ${source.stock.expiryDate ?? 'Chưa có'} · Khả dụng tại nguồn: ${source.stock.availableQuantity}. Đang giữ chỗ: ${source.stock.reservedQuantity}.`} />}
        <Controller control={state.form.control} name="quantity" render={({ field, fieldState }) => <TextField
          label={`Số lượng thực tế chuyển (${source?.unit.unitName ?? 'đơn vị cơ sở'})`} keyboardType="decimal-pad" editable={!busy}
          value={Number.isFinite(field.value) ? String(field.value) : ''} onBlur={field.onBlur} error={fieldState.error?.message}
          onChangeText={value => field.onChange(value.trim() ? Number(value.trim().replace(',', '.')) : Number.NaN)} />}/>
        <Button label="Tải vị trí cho số lượng này" variant="outline" loading={state.recommendations.isFetching}
          disabled={busy || !source || state.source.isFetching} onPress={() => { void state.loadRecommendations(); }} />
        {state.recommendations.error && <AlertBanner title="Chưa tải được gợi ý mới" description={getApiErrorMessage(state.recommendations.error)} />}
        {!state.recommendationsFresh && <AlertBanner title="Chọn số lượng rồi tải lại vị trí" description="Gợi ý phải khớp số lượng hiện tại trước khi xác nhận." />}
        {state.recommendationsFresh && !state.destinations.length && <AlertBanner title="Chưa có vị trí đích được phép" description="Giữ công việc chờ xử lý và liên hệ quản lý kho; chưa ghi chuyển vị trí." />}
        {state.destinations.map(destination => <View key={destination.id} style={styles.option}>
          <Button label={`${state.selectedDestination?.id === destination.id ? 'Đã chọn · ' : ''}${destination.title}`} variant="outline"
            disabled={busy} onPress={() => state.selectDestination(destination.id)} />
          <Text style={[styles.text, { color: theme.textSecondary }]}>{destination.reasons.join(' · ')}</Text>
        </View>)}
        {state.form.formState.errors.destinationSlotId && <AlertBanner title="Vui lòng chọn vị trí đích được phép." />}
        {scans.map(({ name, label }) => <Controller key={name} control={state.form.control} name={name}
          render={({ field, fieldState }) => <TextField label={label} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            editable={!busy} autoCapitalize="none" autoCorrect={false} maxLength={200} error={fieldState.error?.message}
            labelAccessory={<Button label={`Quét ${label.toLowerCase()}`} variant="outline" disabled={busy || !source || (name === 'destinationScan' && !state.selectedDestination)} onPress={() => setScan(name)} />} />}/>) }
        <Controller control={state.form.control} name="overrideReason" render={({ field, fieldState }) => <TextField
          label="Lý do chọn khác gợi ý ưu tiên (nếu có)" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          maxLength={500} multiline editable={!busy} error={fieldState.error?.message} />}/>
        {state.notice && <AlertBanner title={state.notice} />}
        <Button label="Kiểm tra số hàng đã chuyển" loading={busy} disabled={!source || state.source.isFetching || !state.recommendationsFresh || !state.selectedDestination}
          onPress={() => { void state.review(); }} />
        <Button label="Đóng nhập chuyển vị trí" variant="outline" disabled={busy} onPress={close} />
      </ScrollView>
    </KeyboardAvoidingView>
    <Modal visible={!!scan && !!line && !state.target} onRequestClose={() => setScan(null)}>
      <SafeAreaView style={styles.root}>{scan && <ScannerScreen title={scans.find(row => row.name === scan)?.label ?? 'Quét mã'} onClose={() => setScan(null)}
        onScan={code => {
          if (scan === 'sourceScan' && !matchesRelocationSlot(code, line.sourceSlotId, line.sourceSlotCode)) return false;
          if (scan === 'destinationScan' && (!state.selectedDestination || !matchesRelocationSlot(code, state.selectedDestination.id, state.selectedDestination.code))) return false;
          if (scan === 'productScan' && ![source?.product.sku, source?.product.barcodeValue].some(value => value?.trim().toLowerCase() === code.trim().toLowerCase())) return false;
          state.form.setValue(scan, code, { shouldDirty: true, shouldValidate: true }); setScan(null); return true;
        }} />}</SafeAreaView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 32 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 }, option: { gap: 6 } });
