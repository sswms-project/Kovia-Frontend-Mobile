import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckSquare, Square } from 'lucide-react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFormDraft } from '@/hooks/use-form-draft';
import { useExitProtection, useModalExit } from '@/hooks/use-screen-exit';
import { WorkActionBar } from '@/components/work-action-bar';
import { P } from '@/config/permission-codes';
import { StagingPointField } from '@/features/warehouse-access/components/staging-point-field';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { ScanCountButton } from '@/features/scanner/components/scan-count-button';
import { codesMatch, matchesWarehouseLocation } from '@/features/scanner/warehouse-scan';

import type { useTransferReceiving } from '../hooks/use-transfer-receiving';
import { useTransferReceiptExecution } from '../hooks/use-transfer-receipt-execution';
import { transferReceiptDraftSchema, type TransferReceiptDraft, type TransferExecutionSlot, type TransferReceiptEntry } from '../transfer-execution.schema';
import type { TransferPutAwayRow, TransferReceivingMode } from '../transfer-receiving.schema';
import { TransferLocationSelector } from './transfer-location-selector';
import { transferReceivingApi } from '../transfer-receiving.api';

const countKey = (lineId: string, lotId: string | null) => `${lineId}:${lotId ?? 'none'}`;
function actual(value: string) { return value.trim() ? Number(value.trim().replace(',', '.')) : Number.NaN; }

export function TransferReceiptEditor({ state, transferId, shipmentId, mode, children, onSubmitted }: {
  readonly state: ReturnType<typeof useTransferReceiving>; readonly transferId: string; readonly shipmentId: string; readonly mode: TransferReceivingMode;
  readonly children: (controls: ReactNode) => ReactNode;
  readonly onSubmitted?: () => void;
}) {
  const persistence = useRef<ReturnType<typeof useFormDraft> | null>(null);
  const execution = useTransferReceiptExecution(state, transferId, shipmentId, persistence);
  const theme = useTheme();
  const form = useForm<TransferReceiptDraft>({ resolver: zodResolver(transferReceiptDraftSchema), defaultValues: {
    action: 'Start', keepAtReceiving: null, counts: {}, scan: '', damageScan: '', productScan: '', putQuantity: '', note: '',
  } });
  const [location, setLocation] = useState<TransferExecutionSlot | null>(null);
  const [receivingChoice, setReceivingChoice] = useState('');
  const scan = useWatch({ control: form.control, name: 'scan' });
  const setScan = (value: string) => form.setValue('scan', value, { shouldDirty: true });
  const [damageLocation, setDamageLocation] = useState<TransferExecutionSlot | null>(null);
  const damageScan = useWatch({ control: form.control, name: 'damageScan' });
  const setDamageScan = (value: string) => form.setValue('damageScan', value, { shouldDirty: true });
  const keep = useWatch({ control: form.control, name: 'keepAtReceiving' });
  const KeepIcon = keep === true ? CheckSquare : Square;
  const counts = useWatch({ control: form.control, name: 'counts' });
  const [open, setOpen] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [version, setVersion] = useState('');
  const [putRow, setPutRow] = useState<TransferPutAwayRow | null>(null);
  const putQuantity = useWatch({ control: form.control, name: 'putQuantity' });
  const setPutQuantity = (value: string) => form.setValue('putQuantity', value, { shouldDirty: true });
  const productScan = useWatch({ control: form.control, name: 'productScan' });
  const setProductScan = (value: string) => form.setValue('productScan', value, { shouldDirty: true });
  const note = useWatch({ control: form.control, name: 'note' });
  const setNote = (value: string) => form.setValue('note', value, { shouldDirty: true });
  const [error, setError] = useState<string | null>(null);
  const scanGeneration = useRef(0);
  useEffect(() => () => { scanGeneration.current++; }, []);
  const data = state.data;
  const staged = (data?.receipt.outboundStagingFlowVersion ?? 0) > 0;
  const receivingSlotId = receivingChoice || data?.receipt.stagingPoints?.suggestedSlotId || '';
  const receivingPoint = data?.receipt.stagingPoints?.items.find(point => point.slotId === receivingSlotId);
  const draft = useFormDraft({ form, feature: mode === 'PutAway' ? 'transfer-putaway' : 'transfer-receipt', documentId: `${transferId}:${shipmentId}`,
    lineId: open && putRow ? countKey(putRow.lineId, putRow.lotId) : undefined, version: open ? version : execution.target?.body.expectedVersion,
    enabled: (open || !!execution.target) && state.canView && !!state.access.profile.data?.permissions.includes(P.TRANSFERS_RECEIVE),
    assertCurrent: () => execution.assertCurrent(open ? version : execution.target?.body.expectedVersion ?? '') });
  useEffect(() => { persistence.current = draft; });
  const busy = execution.mutation.isPending;
  useExitProtection(() => ({ busy, dirty: !open && form.formState.isDirty, discard: async () => { form.reset(); } }));
  const close = useModalExit(() => { setOpen(false); execution.cancel(); });
  const lots = data?.receipt.lines.flatMap(line => line.lots.map(lot => ({ line, lot, key: countKey(line.lineId, lot.lotId) }))) ?? [];
  const hasDamage = lots.some(row => actual(counts[row.key]?.damaged ?? '0') > 0);
  const scanLocation = (selected: TransferExecutionSlot | null, onChange: (code: string) => void, includeIsolation = false) => <ScanCodeButton compact
    label="Quét" title="Quét mã vị trí đã chọn" disabled={busy || !selected}
    onOpen={() => { scanGeneration.current++; }} onBeforeClose={() => { scanGeneration.current++; return true; }}
    onScan={async code => {
      if (!selected || !data || !code.trim() || code.trim().length > (putRow ? 100 : 200)) return false;
      const generation = scanGeneration.current;
      try {
        // The location DTO has only code/path. Resolve rack QR/custom labels within the assigned destination warehouse.
        if (!matchesWarehouseLocation(code, { slotId: selected.id, slotCode: selected.code })) {
          const slots = await transferReceivingApi.slots(data.document.destinationWarehouseId, code.trim(), undefined, includeIsolation);
          if (!slots.some(slot => slot.id === selected.id)) return false;
        }
        if (generation !== scanGeneration.current) return false;
        execution.assertCurrent(data.receipt.version ?? ''); onChange(code.trim()); return true;
      } catch (failure) { setError(failure instanceof Error ? failure.message : 'Chưa đối chiếu được mã vị trí.'); return false; }
    }} />;
  function openReceipt() {
    if (!data?.receipt.version) return;
    setVersion(data.receipt.version); setError(null); setPutRow(null);
    form.reset({ action: 'Receipt', keepAtReceiving: false, counts: Object.fromEntries(lots.map(row => [row.key, { good: '', damaged: '0', missing: '0', reason: '' }])),
      scan: '', damageScan: '', productScan: '', putQuantity: '', note: '' });
    setOpen(true);
  }
  function openPutAway(row: TransferPutAwayRow) {
    if (!data?.receipt.version) return;
    setVersion(data.receipt.version); setError(null); setPutRow(row);
    form.reset({ action: 'PutAway', keepAtReceiving: false, counts: {}, scan: '', damageScan: '', productScan: '', putQuantity: '', note: '' });
    setLocation(null); setOpen(true);
  }
  function review() {
    try {
      if (!data || !version || version !== data.receipt.version || !execution.allowed(putRow ? 'PutAway' : 'Submit'))
        throw new Error('Phiên bản hoặc quyền đã thay đổi. Đóng biểu mẫu và tải lại trước khi tiếp tục.');
      if (putRow) {
        const quantity = actual(putQuantity);
        if (!location || !Number.isFinite(quantity) || quantity <= 0 || quantity > putRow.remainingQuantity ||
          Number(quantity.toFixed(putRow.baseQuantityPrecision)) !== quantity || !scan.trim() || !productScan.trim())
          throw new Error('Chọn vị trí, nhập số lượng hợp lệ và xác nhận mã vị trí/sản phẩm.');
        const product = data.receipt.lines.find(line => line.lineId === putRow.lineId);
        if (!product || !codesMatch(productScan, product.sku, product.barcode)) throw new Error('Mã sản phẩm không khớp với dòng hàng cần cất.');
        const budget = putRow.planBudgets.find(row => row.slotId === location.id)?.remainingBudget ?? 0;
        const deviation = putRow.planMode === 'Planned' && quantity > budget;
        if (deviation && note.trim().length < 5) throw new Error('Cất khác kế hoạch cần ghi chú ít nhất 5 ký tự.');
        execution.prepare({ action: 'PutAway', body: { expectedVersion: version, commandId: '', planVersion: data.putAway!.planVersion,
          entries: [{ lineId: putRow.lineId, lotId: putRow.lotId, qualityStatus: 'Good', destinationSlotId: location.id,
            quantity, scannedSlotCode: scan.trim(), scannedProductCode: productScan.trim(),
            deviationReasonCode: deviation ? 'Other' : null, note: note.trim() || null, slotCodeUnreadable: false }] } });
        return;
      }
      const entries: TransferReceiptEntry[] = lots.map(({ line, lot, key }) => {
        const entered = counts[key];
        const good = actual(entered?.good ?? ''); const damaged = actual(entered?.damaged ?? ''); const missing = actual(entered?.missing ?? '');
        const precision = line.baseQuantityPrecision;
        if ([good, damaged, missing].some(value => !Number.isFinite(value) || value < 0 || Number(value.toFixed(precision)) !== value) ||
          Math.round((good + damaged + missing) * 10 ** precision) !== Math.round(lot.dispatchedQuantity * 10 ** precision))
          throw new Error(`${line.sku}: nhập thực tế tốt/hỏng/thiếu đúng đơn vị và khớp số đã xuất của từng lô.`);
        if ((damaged > 0 || missing > 0) && !entered.reason.trim()) throw new Error(`${line.sku}: hàng hỏng/thiếu cần nguyên nhân.`);
        return { lineId: line.lineId, lotId: lot.lotId, goodQuantity: good, damagedQuantity: damaged,
          missingQuantity: missing, reasonCode: entered.reason.trim() || null, note: null };
      });
      if (hasDamage && data.receipt.receiptFlowVersion === 2 && (!damageLocation || !damageScan.trim() || damageLocation.id === data.receipt.receivingSlotId))
        throw new Error('Hãy chọn và xác nhận vị trí thực tế cách biệt hàng hỏng, khác vị trí nhận.');
      execution.prepare({ action: 'Submit', body: { expectedVersion: version, commandId: '', entries,
        keepAtReceiving: keep === true && data.receipt.receiptFlowVersion === 2,
        damagedSlotId: hasDamage ? damageLocation?.id ?? null : null, scannedDamagedSlotCode: hasDamage ? damageScan.trim() : null } });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Dữ liệu chưa hợp lệ.'); }
  }
  if (!data || !state.canView) return <>{children(null)}</>;
  return <>{!open && children(<View style={styles.section}>
    {execution.notice && <AlertBanner title={execution.notice} />}
    {mode === 'Receive' && data.receipt.status === 'InTransit' && <>
      {staged ? <StagingPointField label="Điểm chờ nhận thực tế" points={data.receipt.stagingPoints} value={receivingSlotId}
        disabled={busy || !execution.allowed('Start')} onChange={setReceivingChoice} /> : <>
        <TransferLocationSelector warehouseId={data.document.destinationWarehouseId} scopeKey={execution.key} title="Vị trí thực tế nhận hàng"
          selected={location} onSelect={setLocation} disabled={busy || !execution.allowed('Start')} />
        <TextField label="Quét hoặc nhập mã vị trí nhận" value={scan} onChangeText={setScan} editable={!busy} maxLength={200} autoCapitalize="characters"
          labelAccessory={scanLocation(location, setScan)} />
      </>}
      <Button label="Bắt đầu nhận tại vị trí này" disabled={busy || !execution.allowed('Start') || (staged ? !receivingPoint : !location || !scan.trim())}
        onPress={() => execution.prepare({ action: 'Start', body: { expectedVersion: data.receipt.version!, commandId: '',
          receivingSlotId: staged ? receivingSlotId : location!.id, ...(staged ? {} : { scannedSlotCode: scan.trim() }) } })} />
    </>}
    {mode === 'Receive' && data.receipt.status === 'Receiving' && <Button label="Ghi số lượng thực nhận / hỏng / thiếu" disabled={!execution.allowed('Submit') || busy} onPress={openReceipt} />}
    {mode === 'PutAway' && data.putAway?.canResumePutAway && <Button label="Tiếp tục cất phần hàng còn ở khu nhận" variant="outline"
      disabled={!execution.allowed('Resume') || busy} onPress={() => execution.prepare({ action: 'Resume', body: { expectedVersion: data.receipt.version!, commandId: '' } })} />}
    {mode === 'PutAway' && data.receipt.status === 'AwaitingPutAway' && data.putAway?.rows.filter(row => row.remainingQuantity > 0).map(row =>
      <Button key={countKey(row.lineId, row.lotId)} label={`Cất ${row.sku} · lô ${row.lotNumber ?? 'không có'}`} variant="outline" disabled={!execution.allowed('PutAway') || busy} onPress={() => openPutAway(row)} />)}
    </View>)}
    {open && <View style={styles.root}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <Button label="Về đối chiếu phiếu" variant="ghost" disabled={busy} onPress={close} />
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList style={styles.root} data={putRow ? [] : lots} keyExtractor={row => row.key} contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled" ListHeaderComponent={<View style={styles.section}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{putRow ? `Cất ${putRow.sku}` : 'Ghi kết quả kiểm hàng thực tế'}</Text>
            {state.realtime.changed && <AlertBanner title="Phiếu điều chuyển có cập nhật" description="Số liệu đang nhập được giữ lại. Quay về và tải lại trước khi gửi." />}
            {error && <AlertBanner variant="destructive" title={error} />}
            {putRow ? <>
              <TransferLocationSelector warehouseId={data.document.destinationWarehouseId} scopeKey={execution.key} title="Vị trí thực cất" selected={location} onSelect={setLocation} disabled={busy} />
              <TextField label={`Số thực cất (${putRow.baseUnitName})`} value={putQuantity} onChangeText={setPutQuantity} keyboardType="decimal-pad" editable={!busy} />
              <TextField label="Quét hoặc nhập mã vị trí đích" value={scan} onChangeText={setScan} maxLength={100} editable={!busy} autoCapitalize="characters"
                labelAccessory={scanLocation(location, setScan)} />
              <TextField label="Quét hoặc nhập mã SKU / sản phẩm" value={productScan} onChangeText={setProductScan} maxLength={100} editable={!busy} autoCapitalize="characters"
                labelAccessory={<ScanCodeButton compact label="Quét" title={`Quét mã ${putRow.sku}`} disabled={busy} onScan={code => {
                  const product = data.receipt.lines.find(line => line.lineId === putRow.lineId);
                  if (!product || !codesMatch(code, product.sku, product.barcode)) return false;
                  setProductScan(code.trim()); return true;
                }} />} />
              <TextField label="Ghi chú nếu khác kế hoạch" value={note} onChangeText={setNote} maxLength={500} editable={!busy} multiline />
            </> : <AlertBanner title="Nhập số đã kiểm thực tế" description="Không tự sao chép số dự kiến thành số đã nhận. Tổng tốt, hỏng và thiếu của mỗi lô phải khớp số đã xuất." />}
          </View>}
          renderItem={({ item: row }) => <View style={[styles.receiptCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>{row.line.sku} · Lô {row.lot.lotNumber ?? 'Không có'}</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>Đã xuất {row.lot.dispatchedQuantity} {row.line.baseUnitName}</Text>
            <ScanCountButton compact={false} label="Quét mã hàng" title={`Quét đếm ${row.line.sku} · Lô ${row.lot.lotNumber ?? 'không có'}`}
              quantity={actual(counts[row.key]?.good ?? '')} maximum={row.lot.dispatchedQuantity - actual(counts[row.key]?.damaged ?? '0') - actual(counts[row.key]?.missing ?? '0')}
              unitName={row.line.baseUnitName} disabled={busy || !execution.allowed('Submit')} matches={code => codesMatch(code, row.line.sku, row.line.barcode)}
              onConfirm={quantity => form.setValue(`counts.${row.key}.good`, String(quantity), { shouldDirty: true, shouldValidate: true })} />
            <Text style={[styles.hint, { color: theme.textSecondary }]}>Quét để đếm hàng đạt. Xác nhận lượt quét để cộng vào SL thực nhận; ghi riêng hàng hỏng và thiếu.</Text>
            <View style={styles.quantities}>
              {(['good', 'damaged', 'missing'] as const).map(field => <View key={`label-${field}`} style={styles.quantity}>
                <Text style={[styles.quantityLabel, { color: theme.text }]}>{{ good: 'SL thực nhận', damaged: 'SL hỏng', missing: 'SL thiếu' }[field]}</Text>
              </View>)}
            </View>
            <View style={styles.quantities}>
              {(['good', 'damaged', 'missing'] as const).map(field => <View key={field} style={styles.quantity}>
                <TextField hideLabel label={{ good: 'SL thực nhận', damaged: 'SL hỏng', missing: 'SL thiếu' }[field]}
                  value={counts[row.key]?.[field] ?? ''} editable={!busy} keyboardType="decimal-pad" maxLength={20}
                  error={form.formState.errors.counts?.[row.key]?.[field]?.message}
                  onChangeText={value => form.setValue(`counts.${row.key}.${field}`, value, { shouldDirty: true })} />
              </View>)}
            </View>
            <Text accessibilityLiveRegion="polite" style={[styles.text, { color: theme.textSecondary }]}>
              Đã kiểm: {(['good', 'damaged', 'missing'] as const).reduce((sum, field) => sum + (actual(counts[row.key]?.[field] ?? '') || 0), 0)} / {row.lot.dispatchedQuantity} {row.line.baseUnitName}
            </Text>
            <TextField label="Nguyên nhân hỏng / thiếu" value={counts[row.key]?.reason ?? ''} editable={!busy} maxLength={50}
              onChangeText={value => form.setValue(`counts.${row.key}.reason`, value, { shouldDirty: true })} />
          </View>}
          ListFooterComponent={<View style={styles.section}>
            {!putRow && data.receipt.receiptFlowVersion === 2 && <>
              <Pressable accessibilityRole="checkbox" accessibilityLabel="Giữ hàng đạt tại khu nhận"
                accessibilityState={{ checked: keep === true, disabled: busy }} disabled={busy}
                onPress={() => form.setValue('keepAtReceiving', keep !== true, { shouldDirty: true, shouldValidate: true })}
                style={({ pressed }) => [styles.keepChoice, { borderColor: keep === true ? theme.primary : theme.border,
                  backgroundColor: keep === true ? theme.primaryContainer : theme.card }, (busy || pressed) && styles.dim]}>
                <KeepIcon size={24} color={theme.primary} />
                <Text style={[styles.keepLabel, { color: theme.text }]}>Giữ hàng đạt tại khu nhận</Text>
              </Pressable>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>Tick: hàng đạt có thể được lấy trực tiếp theo FEFO tại khu nhận. Không tick: hàng tiếp tục chờ cất. Hàng hỏng luôn được cách biệt.</Text>
              {hasDamage && <>
                <TransferLocationSelector warehouseId={data.document.destinationWarehouseId} scopeKey={execution.key} title="Vị trí thực tế cách biệt hàng hỏng" selected={damageLocation} onSelect={setDamageLocation} disabled={busy} includeIsolation />
                <TextField label="Quét hoặc nhập mã vị trí cách biệt" value={damageScan} onChangeText={setDamageScan} maxLength={200} editable={!busy} autoCapitalize="characters"
                  labelAccessory={scanLocation(damageLocation, setDamageScan, true)} />
              </>}
            </>}
          </View>} />
          <WorkActionBar hint={putRow ? 'Cất chỉ chuyển vị trí; không cộng tồn lần nữa.' : 'Đối chiếu từng lô và cách xử lý hàng đạt trước khi xác nhận.'}>
            <Button label="Kiểm tra trước khi xác nhận" disabled={!execution.allowed(putRow ? 'PutAway' : 'Submit') || busy}
              onPress={() => { void form.handleSubmit(review, () => setError('Dữ liệu chưa hợp lệ. Kiểm tra số thực tế và cách xử lý hàng đạt.'))(); }} />
          </WorkActionBar>
        </KeyboardAvoidingView>
        <ConfirmationModal visible={!!execution.target && execution.target.action !== 'Start'} title="Xác nhận đã thực hiện thực tế?"
          description={putRow ? 'Chỉ xác nhận số lượng đã cất đúng vị trí, lô và mã sản phẩm.' : keep ? 'Xác nhận số thực nhận đã kiểm. Hàng đạt ở khu nhận có thể được phân bổ FEFO ngay; hàng hỏng đã đặt cách biệt và vẫn bị Hold.' : 'Xác nhận số thực nhận đã kiểm. Hàng đạt tiếp tục chờ cất; hàng hỏng đã cách biệt và vẫn bị Hold.'}
          busy={busy} confirmDisabled={state.realtime.changed} error={execution.mutation.error} onConfirm={() => {
            const submitted = execution.target?.action === 'Submit';
            void execution.confirm().then(success => { if (success) { form.reset(); setOpen(false); if (submitted) onSubmitted?.(); } });
          }} onCancel={execution.cancel} />
        <ConfirmationModal visible={discard} title="Bỏ thay đổi chưa lưu?" description="Dữ liệu nhập trong biểu mẫu chưa được lưu. Bạn có muốn đóng?"
          busy={busy} onConfirm={() => { void draft.discardAndClose(() => { setOpen(false); setDiscard(false); execution.cancel(); }); }} onCancel={() => setDiscard(false)} />
      </View>
    </View>}
    <ConfirmationModal visible={!open && (execution.target?.action === 'Start' || execution.target?.action === 'Resume')}
      title={execution.target?.action === 'Resume' ? 'Tiếp tục cất hàng?' : 'Xác nhận bắt đầu nhận hàng?'}
      description={execution.target?.action === 'Resume' ? 'Chỉ tiếp tục cất phần hàng còn khả dụng tại khu nhận. Không tăng tồn thêm và không lấy phần đã được giữ cho công việc khác.'
        : `Hàng đã tới vị trí ${staged ? receivingPoint?.label ?? '' : location?.path ?? ''}. Bước này chưa ghi số thực nhận; cần kiểm và xác nhận số lượng tiếp theo.`}
      busy={busy} confirmDisabled={state.realtime.changed} error={execution.mutation.error} onConfirm={() => { void execution.confirm(); }} onCancel={execution.cancel} />
  </>;
}
const styles = StyleSheet.create({ root: { flex: 1, minHeight: 0 }, section: { gap: 12 }, quantities: { flexDirection: 'row', gap: 8 }, quantity: { flex: 1, minWidth: 0 }, quantityLabel: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 }, content: { padding: 20, gap: 20, paddingBottom: 48 },
  keepChoice: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, padding: 12, borderWidth: 1, borderRadius: Radius.md },
  keepLabel: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 22 }, dim: { opacity: 0.6 },
  receiptCard: { gap: 12, padding: 16, borderWidth: 1, borderRadius: Radius.lg }, hint: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 20 },
  title: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 25 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
