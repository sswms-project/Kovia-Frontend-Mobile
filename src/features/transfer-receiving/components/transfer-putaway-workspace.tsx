import { useCallback, useState } from 'react';
import { Controller } from 'react-hook-form';
import { FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WorkScreenHeader } from '@/components/work-screen-header';
import { WorkActionBar } from '@/components/work-action-bar';
import { AlertBanner } from '@/components/ui/alert-banner';
import { WorkDetails } from '@/components/ui/work-details';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { SelectionField } from '@/components/ui/selection-field';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { PUTAWAY_REASON_OPTIONS } from '@/features/receiving/receiving.schema';
import { codesMatch } from '@/features/scanner/warehouse-scan';
import type { useTransferPutawayAllocation } from '../hooks/use-transfer-putaway-allocation';
import { TransferLocationSelector } from './transfer-location-selector';

type State = ReturnType<typeof useTransferPutawayAllocation>;
function AllocationCard({ state, index }: { readonly state: State; readonly index: number }) {
  const theme = useTheme(), line = state.values[index];
  const row = state.sheet?.rows.find(row => row.lineId === line?.lineId && row.lotId === line?.lotId);
  if (!row || !line) return null;
  const scan = line.destination ? state.scans[`${index}:${line.destination.id}`] : undefined;
  const product = state.sheet?.receipt.lines.find(value => value.lineId === line.lineId);
  const invalidProduct = !!scan?.product && !!product && !codesMatch(scan.product, product.sku, product.barcode);
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Phân bổ {index + 1}</Text>
    <Text style={[styles.name, { color: theme.text }]}>{row.sku} · {row.productName}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Lô {row.lotNumber ?? 'không có'} · Còn được cất {row.remainingQuantity} {row.baseUnitName}</Text>
    <Button label={line.destination?.path ?? 'Chọn vị trí cất'} variant="outline" disabled={state.locked} onPress={() => state.setPicker(index)} />
    <Controller control={state.form.control} name={`lines.${index}.quantity`} render={({ field, fieldState }) => <TextField
      label={`Số thực cất (${row.baseUnitName})`} value={field.value} keyboardType="decimal-pad" editable={!state.locked}
      onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />} />
    <Button label={line.slotCodeUnreadable ? 'Dùng lại mã vị trí' : 'Không quét được mã vị trí?'} variant="ghost" disabled={state.locked}
      onPress={() => state.setUnreadable(index, !line.slotCodeUnreadable)} />
    {line.slotCodeUnreadable ? <AlertBanner title="Xác nhận vị trí bằng thực tế" description="Kiểm tra đúng khu/kệ/ô đã chọn. Chọn lý do nhãn hỏng hoặc lý do khác có ghi chú; thông tin được ghi vào lịch sử." /> : <>
      <TextField label="Mã vị trí thực tế" value={state.texts[index] ?? ''} onChangeText={value => state.changeScan(index, value)}
        editable={!state.locked && !!line.destination} maxLength={100} autoCapitalize="characters"
        labelAccessory={<ScanCodeButton compact label="Quét mã vị trí" title={`Quét vị trí cất ${row.sku}`} disabled={state.locked || !line.destination}
          onScan={value => state.scanSlot(index, value)} />} />
      <Button label={scan?.slot ? 'Đã xác nhận mã vị trí' : 'Xác nhận mã vị trí'} variant="outline" disabled={state.locked || !state.texts[index]?.trim()}
        onPress={() => { void state.scanSlot(index, state.texts[index] ?? ''); }} />
    </>}
    <WorkDetails title="Quét mã hàng (tùy chọn)">
      <ScanCodeButton label="Quét mã hàng" title={`Quét sản phẩm ${row.sku}`}
        disabled={state.locked || !line.destination} onScan={value => state.productScan(index, value)} />
      <TextField label="Hoặc nhập SKU / mã sản phẩm trên nhãn" value={scan?.product ?? ''} maxLength={100} autoCapitalize="characters"
        editable={!state.locked && !!line.destination} onChangeText={value => state.changeProduct(index, value)}
        error={invalidProduct ? 'Mã sản phẩm không khớp dòng hàng.' : undefined} />
    </WorkDetails>
    <SelectionField label="Lý do khác kế hoạch / không quét được nhãn" value={line.reasonCode ?? ''} disabled={state.locked}
      options={[{ value: '', label: 'Theo kế hoạch / chưa chọn lý do' }, ...PUTAWAY_REASON_OPTIONS.map(option => ({ value: option.code, label: option.label }))]}
      onChange={value => { const reason = PUTAWAY_REASON_OPTIONS.find(option => option.code === value)?.code ?? null;
        state.form.setValue(`lines.${index}.reasonCode`, reason, { shouldDirty: true }); }} />
    <Controller control={state.form.control} name={`lines.${index}.note`} render={({ field }) => <TextField label="Ghi chú khác kế hoạch"
      value={field.value} onChangeText={field.onChange} editable={!state.locked} maxLength={500} multiline />} />
    <View style={styles.actions}>
      <Button label="Chia thêm vị trí" variant="outline" disabled={state.locked || state.values.length >= 500} onPress={() => state.add(index)} />
      <Button label="Bỏ phân bổ này" variant="ghost" disabled={state.locked} onPress={() => state.remove(index)} />
    </View>
  </View>;
}

export function TransferPutawayWorkspace({ state, warehouseId, code }: { readonly state: State; readonly warehouseId: string; readonly code: string }) {
  const theme = useTheme();
  const [tab, setTab] = useState<'plan' | 'execution'>('execution');
  const groups = state.values.reduce<{ key: string; indices: number[] }[]>((result, line, index) => {
    const key = `${line.lineId}:${line.lotId ?? ''}`;
    const group = result.find(row => row.key === key);
    if (group) group.indices.push(index); else result.push({ key, indices: [index] });
    return result;
  }, []);
  const renderItem = useCallback(({ item }: { item: { key: string; indices: number[] } }) => {
    const line = state.values[item.indices[0]], row = state.sheet?.rows.find(row => row.lineId === line?.lineId && row.lotId === line?.lotId);
    if (!row) return null;
    return <WorkDetails title={`${row.sku} · ${row.productName} · ${item.indices.length} phân bổ`} defaultOpen>
      <Text style={[styles.text, { color: theme.textSecondary }]}>Lô {row.lotNumber ?? 'không có'} · Còn cất {row.remainingQuantity} {row.baseUnitName}</Text>
      {tab === 'plan' ? row.planBudgets.map(plan => <Text key={plan.slotId} style={[styles.text, { color: theme.text }]}>{plan.path} · Còn theo kế hoạch {plan.remainingBudget} {row.baseUnitName}</Text>)
        : item.indices.map(index => <AllocationCard key={state.fields.fields[index]?.id ?? index} state={state} index={index} />)}
      {tab === 'plan' && !row.planBudgets.length && <Text style={[styles.text, { color: theme.textSecondary }]}>Chưa có kế hoạch vị trí cho dòng hàng này.</Text>}
    </WorkDetails>;
  }, [state, tab, theme.text, theme.textSecondary]);
  const selected = state.picker === null ? null : state.values[state.picker]?.destination;
  return <>
    <Modal visible={state.visible} animationType="slide" onRequestClose={state.execution.mutation.isPending ? undefined : state.close}>
      <SafeAreaProvider><SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <WorkScreenHeader modal title="Phân bổ cất điều chuyển" subtitle={code} onBack={state.close} />
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <FlatList style={styles.root} data={groups} keyExtractor={group => group.key} renderItem={renderItem}
            keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
            ListHeaderComponent={<View style={styles.group}>
              <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Cất hàng tốt theo lô và vị trí</Text>
              <AlertBanner title={`${state.values.length} phân bổ · Có thể chia một lô qua nhiều vị trí`}
                description="Đã điền theo kế hoạch còn lại. Quét xác nhận sau khi đã cất thực tế; lượng chưa cất tiếp tục mở. Tổng tồn kho không tăng thêm." />
              <View style={styles.actions}>
                <View style={styles.tabs}>
                  <View style={styles.tab}><Button label="Kế hoạch" variant={tab === 'plan' ? 'primary' : 'outline'} onPress={() => setTab('plan')} /></View>
                  <View style={styles.tab}><Button label="Thực cất" variant={tab === 'execution' ? 'primary' : 'outline'} onPress={() => setTab('execution')} /></View>
                </View>
                <Button label="Làm theo kế hoạch" variant="outline" disabled={state.locked} onPress={state.replacePlan} />
                <Button label="Gợi ý vị trí cất" variant="outline" loading={state.suggestions.isFetching} disabled={state.locked}
                  onPress={() => { void state.applySuggestions(); }} />
              </View>
              {state.suggestions.error && <AlertBanner title="Chưa tải được gợi ý" description={getApiErrorMessage(state.suggestions.error)} />}
              {state.suggestions.data && <AlertBanner title={state.suggestions.data.summary ?? 'Đã tải gợi ý cất hàng'}
                description={[state.suggestions.data.notice, ...state.suggestions.data.risks].filter(Boolean).join(' ')} />}
              {state.pendingChange && <AlertBanner title="Phiếu hoặc kế hoạch có cập nhật" description="Giữ nguyên các phân bổ đang nhập. Đóng biểu mẫu và tải lại trước khi gửi." />}
              {state.stale && <AlertBanner variant="destructive" title="Phiếu hoặc kế hoạch đã thay đổi" description="Giữ lại dữ liệu để đối chiếu. Đóng và tải lại trước khi gửi." />}
              {state.error && <AlertBanner variant="destructive" title={state.error} />}
            </View>}
            ListEmptyComponent={<AlertBanner title="Chưa có phân bổ" description="Chọn Làm theo kế hoạch hoặc Gợi ý vị trí cất để bắt đầu lại." />} />
          <WorkActionBar hint="Xác nhận mã vị trí hoặc ghi rõ nhãn không đọc được. Mã hàng là tùy chọn; khác kế hoạch cần lý do.">
            <Button label={`Kiểm tra ${state.values.length} phân bổ thực cất`} disabled={state.locked || !state.values.length}
              onPress={() => { void state.review(); }} />
          </WorkActionBar>
        </KeyboardAvoidingView>
        <ConfirmationModal visible={state.execution.target?.action === 'PutAway'} title="Xác nhận các vị trí đã thực cất?"
          description={`${state.execution.target?.action === 'PutAway' ? state.execution.target.body.entries.length : 0} phân bổ sẽ được ghi nhận cùng một lệnh. Tổng tồn kho không thay đổi. Phần chưa cất vẫn được theo dõi.`}
          busy={state.execution.mutation.isPending} confirmDisabled={state.locked} error={state.execution.mutation.error}
          onConfirm={() => { void state.confirm(); }} onCancel={state.execution.cancel} />
      </SafeAreaView></SafeAreaProvider>
    </Modal>
    <Modal visible={state.visible && state.picker !== null} animationType="slide" onRequestClose={() => state.setPicker(null)}>
      <SafeAreaProvider><SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <WorkScreenHeader modal title="Chọn vị trí cất" onBack={() => state.setPicker(null)} />
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><TransferLocationSelector warehouseId={warehouseId} scopeKey={state.execution.key}
            title="Vị trí hàng tốt trong kho nhận" selected={selected ?? null} onSelect={state.choose} disabled={state.locked} /></ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  </>;
}
const styles = StyleSheet.create({ root: { flex: 1, minHeight: 0 }, content: { width: '100%', maxWidth: 800, alignSelf: 'center', padding: 20, gap: 16, paddingBottom: 32 },
  group: { gap: 12 }, card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 12 }, actions: { gap: 8 },
  tabs: { flexDirection: 'row', gap: 8 }, tab: { flex: 1 },
  title: { fontFamily: FontFamily.bold, fontSize: 22, lineHeight: 30 }, name: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 } });
