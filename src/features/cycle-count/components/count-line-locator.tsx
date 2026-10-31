import { ScanLine } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { SelectionField } from '@/components/ui/selection-field';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { useTheme } from '@/hooks/use-theme';
import { canRecordCountItem, findCountLines, formatCountLocation } from '../cycle-count';
import type { CountItem, CycleCount } from '../cycle-count.schema';

interface Props {
  readonly document: CycleCount;
  readonly disabled: boolean;
  readonly onRecord: (item: CountItem, scannedBarcode?: string) => void;
}
export function CountLineLocator({ document, disabled, onRecord }: Props) {
  const theme = useTheme();
  const [slotId, setSlotId] = useState('');
  const activeSlot = useRef('');
  const pending = useRef<{ item: CountItem; code: string } | null>(null);
  const productAccepted = useRef(false);
  const [productCode, setProductCode] = useState('');
  const [selected, setSelected] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const available = document.items.filter(item => canRecordCountItem(document, item));
  const slots = available.filter((item, index, rows) => rows.findIndex(row => row.slotId === item.slotId) === index);
  const slot = document.items.find(item => item.slotId === slotId);
  const candidates = available.filter(item => item.slotId === slotId && (!productCode || findCountLines(document, 'Product', productCode).some(row => row.id === item.id)));
  const item = candidates.find(row => row.id === selected);
  function changeSlot(id: string) {
    activeSlot.current = id; setSlotId(id); setProductCode(''); setSelected(''); setInput(''); setError(null); pending.current = null; productAccepted.current = false;
  }
  function scan(code: string) {
    if (disabled) return false;
    if (!activeSlot.current) {
      const matches = findCountLines(document, 'Location', code);
      if (!matches.length) { setError('Vị trí không có dòng đang mở để kiểm đếm.'); return false; }
      if (new Set(matches.map(row => row.slotId)).size !== 1) { setError('Mã trùng nhiều vị trí. Quét nhãn QR đầy đủ hoặc chọn vị trí.'); return false; }
      changeSlot(matches[0].slotId); return true;
    }
    const matches = findCountLines(document, 'Product', code).filter(row => row.slotId === activeSlot.current);
    if (!matches.length) { setError('Mã hàng không thuộc vị trí này hoặc đã ghi đếm.'); return false; }
    setProductCode(code.trim()); setSelected(matches.length === 1 ? matches[0].id : ''); setError(null);
    productAccepted.current = true;
    if (matches.length === 1) pending.current = { item: matches[0], code: code.trim() };
    return true;
  }
  function afterCamera() {
    const next = pending.current; pending.current = null;
    if (next && !disabled) onRecord(next.item, next.code);
  }
  return <View style={[styles.root, { borderColor: theme.border, backgroundColor: theme.card }]}>
    <Text style={[styles.title, { color: theme.text }]}>Kiểm đếm theo vị trí</Text>
    <Text style={[styles.hint, { color: theme.textSecondary }]}>1. Chọn vị trí → 2. Quét/chọn hàng và lô → 3. Ghi số đếm. Lưu xong tiếp tục tại vị trí này.</Text>
    <ScanCodeButton continuous label={slotId ? 'Quét mã hàng' : 'Quét vị trí và mã hàng'} title={slotId ? 'Quét hàng tại vị trí đang kiểm' : 'Quét vị trí kiểm kê'}
      renderIcon={color => <ScanLine size={22} color={color} />} disabled={disabled} showScannedCode={false}
      onOpen={() => { pending.current = null; productAccepted.current = false; }} onScan={scan} closeAfterScan={() => productAccepted.current}
      onClose={afterCamera} status={error ?? (slot ? formatCountLocation(slot) : 'Quét nhãn vị trí, sau đó quét sản phẩm.')} />
    <SelectionField label="Vị trí đang kiểm" value={slotId} disabled={disabled}
      options={slots.map(row => ({ value: row.slotId, label: formatCountLocation(row) }))} onChange={changeSlot} />
    {slotId && <>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>{available.filter(row => row.slotId === slotId).length} dòng còn cần đếm tại vị trí này</Text>
      <TextField label="Mã hàng / SKU từ máy quét" value={input} editable={!disabled} onChangeText={setInput} autoCapitalize="none" autoCorrect={false} maxLength={100}
        onSubmitEditing={() => { if (scan(input)) afterCamera(); }} />
      <Button label="Kiểm tra mã hàng" variant="outline" disabled={disabled || !input.trim()} onPress={() => { if (scan(input)) afterCamera(); }} />
      <SelectionField label="Sản phẩm / lô / tình trạng hàng" value={selected} disabled={disabled} onChange={setSelected}
        options={candidates.map(row => ({ value: row.id, label: `${row.productSku} · ${row.productName}`,
          description: `Lô ${row.lotNumber ?? 'không có'} · ${row.qualityStatus === 'Good' ? 'Hàng đạt' : row.qualityStatus === 'Damaged' ? 'Hàng hỏng' : 'Cách ly'}` }))} />
      <Button label="Nhập số đếm" disabled={disabled || !item} onPress={() => { if (item) onRecord(item, productCode || undefined); }} />
      <Button label="Quét vị trí khác" variant="ghost" disabled={disabled} onPress={() => changeSlot('')} />
    </>}
    {error && <AlertBanner variant="destructive" title={error} />}
  </View>;
}
const styles = StyleSheet.create({ root: { padding: 16, borderWidth: 1, borderRadius: Radius.lg, gap: 12 },
  title: { fontFamily: FontFamily.semibold, fontSize: 17 }, hint: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 20 } });
