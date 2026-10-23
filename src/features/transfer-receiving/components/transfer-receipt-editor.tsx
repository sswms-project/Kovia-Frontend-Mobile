import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFormDraft } from '@/hooks/use-form-draft';
import { P } from '@/config/permission-codes';

import type { useTransferReceiving } from '../hooks/use-transfer-receiving';
import { useTransferReceiptExecution } from '../hooks/use-transfer-receipt-execution';
import { transferReceiptDraftSchema, type TransferReceiptDraft, type TransferExecutionSlot, type TransferReceiptEntry } from '../transfer-execution.schema';
import type { TransferPutAwayRow, TransferReceivingMode } from '../transfer-receiving.schema';
import { TransferLocationSelector } from './transfer-location-selector';

const countKey = (lineId: string, lotId: string | null) => `${lineId}:${lotId ?? 'none'}`;
function actual(value: string) { return value.trim() ? Number(value.trim().replace(',', '.')) : Number.NaN; }

export function TransferReceiptEditor({ state, transferId, shipmentId, mode }: {
  readonly state: ReturnType<typeof useTransferReceiving>; readonly transferId: string; readonly shipmentId: string; readonly mode: TransferReceivingMode;
}) {
  const execution = useTransferReceiptExecution(state, transferId, shipmentId);
  const theme = useTheme();
  const form = useForm<TransferReceiptDraft>({ resolver: zodResolver(transferReceiptDraftSchema), defaultValues: {
    action: 'Start', counts: {}, scan: '', damageScan: '', productScan: '', putQuantity: '', note: '',
  } });
  const [location, setLocation] = useState<TransferExecutionSlot | null>(null);
  const scan = useWatch({ control: form.control, name: 'scan' });
  const setScan = (value: string) => form.setValue('scan', value, { shouldDirty: true });
  const [damageLocation, setDamageLocation] = useState<TransferExecutionSlot | null>(null);
  const damageScan = useWatch({ control: form.control, name: 'damageScan' });
  const setDamageScan = (value: string) => form.setValue('damageScan', value, { shouldDirty: true });
  const [keep, setKeep] = useState(true);
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
  const data = state.data;
  const draft = useFormDraft({ form, feature: putRow ? 'transfer-putaway' : 'transfer-receipt', documentId: `${transferId}:${shipmentId}`,
    lineId: putRow ? countKey(putRow.lineId, putRow.lotId) : undefined, version,
    enabled: open && state.canView && !!state.access.profile.data?.permissions.includes(P.TRANSFERS_RECEIVE), assertCurrent: () => execution.assertCurrent(version) });
  const busy = execution.mutation.isPending;
  const lots = data?.receipt.lines.flatMap(line => line.lots.map(lot => ({ line, lot, key: countKey(line.lineId, lot.lotId) }))) ?? [];
  const hasDamage = lots.some(row => actual(counts[row.key]?.damaged ?? '0') > 0);
  function openReceipt() {
    if (!data?.receipt.version) return;
    setVersion(data.receipt.version); setError(null); setPutRow(null);
    form.reset({ action: 'Receipt', counts: Object.fromEntries(lots.map(row => [row.key, { good: '', damaged: '0', missing: '0', reason: '' }])),
      scan: '', damageScan: '', productScan: '', putQuantity: '', note: '' });
    setKeep(data.receipt.receiptFlowVersion === 2); setOpen(true);
  }
  function openPutAway(row: TransferPutAwayRow) {
    if (!data?.receipt.version) return;
    setVersion(data.receipt.version); setError(null); setPutRow(row);
    form.reset({ action: 'PutAway', counts: {}, scan: '', damageScan: '', productScan: '', putQuantity: '', note: '' });
    setLocation(null); setOpen(true);
  }
  function review() {
    try {
      if (!data || !version || version !== data.receipt.version || !execution.enabled)
        throw new Error('Phiên bản hoặc quyền đã thay đổi. Đóng biểu mẫu và tải lại trước khi tiếp tục.');
      if (putRow) {
        const quantity = actual(putQuantity);
        if (!location || !Number.isFinite(quantity) || quantity <= 0 || quantity > putRow.remainingQuantity ||
          Number(quantity.toFixed(putRow.baseQuantityPrecision)) !== quantity || !scan.trim() || !productScan.trim())
          throw new Error('Chọn vị trí, nhập số lượng hợp lệ và xác nhận mã vị trí/sản phẩm.');
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
        keepAtReceiving: keep && data.receipt.receiptFlowVersion === 2,
        damagedSlotId: hasDamage ? damageLocation?.id ?? null : null, scannedDamagedSlotCode: hasDamage ? damageScan.trim() : null } });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Dữ liệu chưa hợp lệ.'); }
  }
  if (!data || !state.canView) return null;
  return <View style={styles.section}>
    {execution.notice && <AlertBanner title={execution.notice} />}
    {mode === 'Receive' && data.receipt.status === 'InTransit' && execution.enabled && <>
      <TransferLocationSelector warehouseId={data.document.destinationWarehouseId} scopeKey={execution.key} title="Vị trí thực tế nhận hàng"
        selected={location} onSelect={setLocation} disabled={busy} />
      <TextField label="Quét hoặc nhập mã vị trí nhận" value={scan} onChangeText={setScan} editable={!busy} maxLength={200} autoCapitalize="characters" />
      <Button label="Bắt đầu nhận tại vị trí này" disabled={busy || !location || !scan.trim()}
        onPress={() => execution.prepare({ action: 'Start', body: { expectedVersion: data.receipt.version!, commandId: '', receivingSlotId: location!.id, scannedSlotCode: scan.trim() } })} />
    </>}
    {mode === 'Receive' && data.receipt.status === 'Receiving' && <Button label="Ghi số thực nhận tốt / hỏng / thiếu" disabled={!execution.enabled || busy} onPress={openReceipt} />}
    {mode === 'PutAway' && data.receipt.status === 'AwaitingPutAway' && data.putAway?.rows.filter(row => row.remainingQuantity > 0).map(row =>
      <Button key={countKey(row.lineId, row.lotId)} label={`Cất ${row.sku} · lô ${row.lotNumber ?? 'không có'}`} variant="outline" disabled={!execution.enabled || busy} onPress={() => openPutAway(row)} />)}
    <Modal visible={open} animationType="slide" onRequestClose={busy ? undefined : () => setDiscard(true)}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <FlatList data={putRow ? [] : lots} keyExtractor={row => row.key} contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled" ListHeaderComponent={<View style={styles.section}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{putRow ? `Cất ${putRow.sku}` : 'Ghi kết quả kiểm hàng thực tế'}</Text>
            {error && <AlertBanner variant="destructive" title={error} />}
            {putRow ? <>
              <TransferLocationSelector warehouseId={data.document.destinationWarehouseId} scopeKey={execution.key} title="Vị trí thực cất" selected={location} onSelect={setLocation} disabled={busy} />
              <TextField label={`Số thực cất (${putRow.baseUnitName})`} value={putQuantity} onChangeText={setPutQuantity} keyboardType="decimal-pad" editable={!busy} />
              <TextField label="Quét hoặc nhập mã vị trí đích" value={scan} onChangeText={setScan} maxLength={200} editable={!busy} autoCapitalize="characters" />
              <TextField label="Quét hoặc nhập mã SKU / sản phẩm" value={productScan} onChangeText={setProductScan} maxLength={200} editable={!busy} autoCapitalize="characters" />
              <TextField label="Ghi chú nếu khác kế hoạch" value={note} onChangeText={setNote} maxLength={500} editable={!busy} multiline />
            </> : <AlertBanner title="Nhập số đã kiểm thực tế" description="Không tự sao chép số dự kiến thành số đã nhận. Tổng tốt, hỏng và thiếu của mỗi lô phải khớp số đã xuất." />}
          </View>}
          renderItem={({ item: row }) => <View style={styles.section}>
            <Text style={[styles.title, { color: theme.text }]}>{row.line.sku} · Lô {row.lot.lotNumber ?? 'Không có'}</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>Đã xuất {row.lot.dispatchedQuantity} {row.line.baseUnitName}</Text>
            {(['good', 'damaged', 'missing', 'reason'] as const).map(field => <TextField key={field}
              label={{ good: 'Thực nhận tốt', damaged: 'Thực nhận hỏng', missing: 'Thiếu', reason: 'Nguyên nhân hỏng / thiếu' }[field]}
              value={counts[row.key]?.[field] ?? ''} editable={!busy} keyboardType={field === 'reason' ? 'default' : 'decimal-pad'}
              maxLength={field === 'reason' ? 50 : 20} error={form.formState.errors.counts?.[row.key]?.[field]?.message}
              onChangeText={value => form.setValue(`counts.${row.key}.${field}`, value, { shouldDirty: true })} />)}
          </View>}
          ListFooterComponent={<View style={styles.section}>
            {!putRow && data.receipt.receiptFlowVersion === 2 && <>
              <Button label={keep ? 'Đã chọn giữ hàng đạt tại khu nhận' : 'Đã chọn tiếp tục cất hàng đạt'} variant="outline" disabled={busy} onPress={() => setKeep(!keep)} />
              {hasDamage && <>
                <TransferLocationSelector warehouseId={data.document.destinationWarehouseId} scopeKey={execution.key} title="Vị trí thực tế cách biệt hàng hỏng" selected={damageLocation} onSelect={setDamageLocation} disabled={busy} />
                <TextField label="Quét hoặc nhập mã vị trí cách biệt" value={damageScan} onChangeText={setDamageScan} maxLength={200} editable={!busy} autoCapitalize="characters" />
              </>}
            </>}
            <Button label="Kiểm tra trước khi xác nhận" disabled={!execution.enabled || busy}
              onPress={() => { void form.handleSubmit(review, () => setError('Dữ liệu chưa hợp lệ. Kiểm tra số thực tế và mã xác nhận.'))(); }} />
            <Button label="Đóng biểu mẫu" variant="outline" disabled={busy} onPress={() => setDiscard(true)} />
          </View>} />
        <ConfirmationModal visible={!!execution.target && execution.target.action !== 'Start'} title="Xác nhận đã thực hiện thực tế?"
          description={putRow ? 'Chỉ xác nhận số lượng đã cất đúng vị trí, lô và mã sản phẩm.' : keep ? 'Xác nhận số thực nhận đã kiểm. Hàng đạt ở khu nhận có thể được phân bổ FEFO ngay; hàng hỏng đã đặt cách biệt và vẫn bị Hold.' : 'Xác nhận số thực nhận đã kiểm. Hàng đạt tiếp tục chờ cất; hàng hỏng đã cách biệt và vẫn bị Hold.'}
          busy={busy} error={execution.mutation.error} onConfirm={() => { void draft.beforeSubmit().then(() => execution.confirm()).then(async success => { if (success) { await draft.clear(); setOpen(false); } }).catch(failure => setError(failure instanceof Error ? failure.message : 'Chưa lưu được trạng thái gửi.')); }} onCancel={execution.cancel} />
        <ConfirmationModal visible={discard} title="Bỏ thay đổi chưa lưu?" description="Dữ liệu nhập trong biểu mẫu chưa được lưu. Bạn có muốn đóng?"
          busy={busy} onConfirm={() => { void draft.clear(); setOpen(false); setDiscard(false); execution.cancel(); }} onCancel={() => setDiscard(false)} />
      </SafeAreaView>
    </Modal>
    <ConfirmationModal visible={!open && execution.target?.action === 'Start'} title="Xác nhận bắt đầu nhận hàng?"
      description={`Hàng đã tới vị trí ${location?.path ?? ''}. Bước này chưa ghi số thực nhận; cần kiểm và xác nhận số lượng tiếp theo.`}
      busy={busy} error={execution.mutation.error} onConfirm={() => { void execution.confirm(); }} onCancel={execution.cancel} />
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, section: { gap: 12 }, content: { padding: 20, gap: 20, paddingBottom: 48 },
  title: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 25 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
