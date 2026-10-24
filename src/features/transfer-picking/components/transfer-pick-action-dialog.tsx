import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { ScannerScreen } from '@/features/scanner/screens/scanner-screen';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import type { TransferDialogKind, TransferDialogValues } from '../hooks/use-transfer-picking';
import { TRANSFER_PICK_REASONS, TRANSFER_PICK_REASON_LABELS, transferEscalateFormSchema, transferReturnFormSchema,
  transferSwitchFormSchema, type TransferPickAlternative, type TransferPickLine } from '../transfer-picking.schema';

type Reason = (typeof TRANSFER_PICK_REASONS)[number];
interface Props { readonly kind: TransferDialogKind; readonly line: TransferPickLine; readonly pickDetailId?: string;
  readonly alternatives: { readonly data?: TransferPickAlternative[]; readonly isPending: boolean; readonly error: Error | null };
  readonly busy: boolean; readonly error: Error | null; readonly onSubmit: (values: TransferDialogValues) => void; readonly onClose: () => void }
const TITLES = { Switch: 'Đổi vị trí/lô lấy hàng', Escalate: 'Báo quản lý xử lý dòng hàng', Return: 'Trả hàng về vị trí' } as const;
const parseQty = (value: string) => value.trim() ? Number(value.replace(',', '.')) : Number.NaN;

export function TransferPickActionDialog({ kind, line, pickDetailId, alternatives, busy, error, onSubmit, onClose }: Props) {
  const theme = useTheme();
  const sources = line.suggestions.filter(value => value.reservedQuantity > 0);
  const [from, setFrom] = useState(sources[0]?.inventoryStockId ?? '');
  const [to, setTo] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<Reason>(kind === 'Escalate' ? 'NotFound' : 'InsufficientAtLocation');
  const [note, setNote] = useState('');
  const [slot, setSlot] = useState('');
  const [scanning, setScanning] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const targets = (alternatives.data ?? []).filter(value => value.inventoryStockId !== from && value.availableQuantity > 0);
  const pick = line.picks.find(value => value.id === pickDetailId);

  function submit() {
    setIssue(null);
    if (kind === 'Switch') {
      const parsed = transferSwitchFormSchema.safeParse({ fromInventoryStockId: from, toInventoryStockId: to, quantity: parseQty(quantity),
        reasonCode: reason, note: note.trim() || null });
      if (!parsed.success) return setIssue(parsed.error.issues[0]?.message ?? 'Dữ liệu chưa hợp lệ.');
      onSubmit({ kind, values: parsed.data });
    } else if (kind === 'Escalate') {
      const parsed = transferEscalateFormSchema.safeParse({ reasonCode: reason, note });
      if (!parsed.success) return setIssue(parsed.error.issues[0]?.message ?? 'Dữ liệu chưa hợp lệ.');
      onSubmit({ kind, values: parsed.data });
    } else {
      const parsed = transferReturnFormSchema.safeParse({ pickDetailId, quantity: quantity.trim() ? parseQty(quantity) : null, scannedSlotCode: slot });
      if (!parsed.success) return setIssue(parsed.error.issues[0]?.message ?? 'Dữ liệu chưa hợp lệ.');
      onSubmit({ kind, values: parsed.data });
    }
  }
  const chips = (items: readonly { key: string; label: string }[], selected: string, onSelect: (key: string) => void) => <View style={styles.chips}>
    {items.map(item => <Button key={item.key} label={item.label} variant={item.key === selected ? undefined : 'outline'} disabled={busy}
      onPress={() => onSelect(item.key)} />)}
  </View>;
  const place = (value: { zoneCode?: string | null; rackCode: string | null; slotCode: string; lotNumber: string | null }) =>
    `${[value.zoneCode, value.rackCode, value.slotCode].filter(Boolean).join(' / ')} · Lô ${value.lotNumber ?? 'không có'}`;
  const selectedTo = targets.find(value => value.inventoryStockId === to);
  const earliest = [...sources].filter(value => value.expiryDate).sort((a, b) => a.expiryDate!.localeCompare(b.expiryDate!))[0];

  return <>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{TITLES[kind]}</Text>
        <Text style={[styles.text, { color: theme.text }]}>{line.sku} · {line.productName}</Text>
        {(issue || error) && <AlertBanner variant="destructive" title={issue ?? 'Chưa thể thực hiện'} description={issue ? undefined : getApiErrorMessage(error)} />}
        {kind === 'Switch' && <>
          <Text style={[styles.label, { color: theme.text }]}>Vị trí/lô đang được giữ chỗ</Text>
          {sources.length ? chips(sources.map(value => ({ key: value.inventoryStockId, label: place(value) })), from, key => { setFrom(key); setTo(''); })
            : <AlertBanner title="Dòng hàng không còn vị trí giữ chỗ để đổi." />}
          <Text style={[styles.label, { color: theme.text }]}>Vị trí/lô thay thế</Text>
          {alternatives.isPending && <AlertBanner title="Đang tải vị trí thay thế…" />}
          {alternatives.error && <AlertBanner variant="destructive" title="Không tải được vị trí thay thế" description={getApiErrorMessage(alternatives.error)} />}
          {!alternatives.isPending && !alternatives.error && !targets.length && <AlertBanner title="Không có vị trí/lô thay thế còn hàng." />}
          {chips(targets.map(value => ({ key: value.inventoryStockId, label: `${place(value)} · còn ${value.availableQuantity}${value.expiryDate ? ` · HSD ${value.expiryDate}` : ''}` })), to, setTo)}
          {selectedTo?.expiryDate && earliest?.expiryDate && selectedTo.expiryDate > earliest.expiryDate && <AlertBanner
            title="Lô thay thế không theo FEFO" description="Lô này có hạn dùng muộn hơn lô đang giữ chỗ. Chọn lý do phù hợp trước khi xác nhận." />}
          <TextField label={`Số lượng đổi (${line.baseUnitName})`} keyboardType="decimal-pad" editable={!busy} value={quantity} onChangeText={setQuantity} />
        </>}
        {kind === 'Return' && <>
          <AlertBanner title={pick ? `Trả từ ${pick.slotCode}` : 'Trả hàng đã lấy'}
            description={pick ? `Có thể trả tối đa ${Math.max(0, pick.pickedQuantity - pick.returnedQuantity - pick.dispatchedQuantity)} ${line.baseUnitName}. Để trống số lượng để trả toàn bộ.` : undefined} />
          <TextField label={`Số lượng trả (${line.baseUnitName})`} keyboardType="decimal-pad" editable={!busy} value={quantity} onChangeText={setQuantity} />
          <TextField label="Mã vị trí nhận lại" value={slot} editable={!busy} autoCapitalize="none" autoCorrect={false} maxLength={101}
            onChangeText={setSlot} labelAccessory={<Button label="Quét" variant="outline" disabled={busy} onPress={() => setScanning(true)} />} />
        </>}
        {kind !== 'Return' && <>
          <Text style={[styles.label, { color: theme.text }]}>Lý do</Text>
          {chips(TRANSFER_PICK_REASONS.map(value => ({ key: value, label: TRANSFER_PICK_REASON_LABELS[value] })), reason, key => setReason(key as Reason))}
          <TextField label={kind === 'Escalate' || reason === 'Other' ? 'Ghi chú (bắt buộc)' : 'Ghi chú'} value={note} editable={!busy} multiline maxLength={500} onChangeText={setNote} />
        </>}
        <Button label="Xác nhận" loading={busy} onPress={submit} />
        <Button label="Đóng" variant="outline" disabled={busy} onPress={onClose} />
      </ScrollView>
    </KeyboardAvoidingView>
    <Modal visible={scanning} onRequestClose={() => setScanning(false)}>
      <SafeAreaView style={styles.root}>{scanning && <ScannerScreen title="Quét mã vị trí" onClose={() => setScanning(false)}
        onScan={code => { setSlot(code); setScanning(false); return true; }} />}</SafeAreaView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 18 },
  title: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 34 }, text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 },
  label: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 22 }, chips: { gap: 8 } });
