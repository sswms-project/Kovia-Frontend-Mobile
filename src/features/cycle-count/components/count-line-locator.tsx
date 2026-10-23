import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { SelectionField } from '@/components/ui/selection-field';
import { FontFamily } from '@/constants/theme';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { useTheme } from '@/hooks/use-theme';

import { findCountLines, type CountScanKind } from '../cycle-count';
import type { CountItem, CycleCount } from '../cycle-count.schema';

interface Props {
  readonly document: CycleCount;
  readonly onRecord: (item: CountItem, scannedBarcode?: string) => void;
}

export function CountLineLocator({ document, onRecord }: Props) {
  const theme = useTheme();
  const [match, setMatch] = useState<{ code: string; kind: CountScanKind; items: readonly CountItem[] } | null>(null);
  const [selected, setSelected] = useState('');
  function scan(kind: CountScanKind, code: string) {
    const items = findCountLines(document, kind, code);
    if (!items.length) return false;
    setMatch({ kind, code, items });
    // Multiple locations or lots always require an explicit choice.
    setSelected(items.length === 1 ? items[0].id : '');
    return true;
  }
  const item = match?.items.find((candidate) => candidate.id === selected);
  return <View style={[styles.root, { borderColor: theme.border, backgroundColor: theme.card }]}>
    <Text style={[styles.title, { color: theme.text }]}>Tìm dòng kiểm kê bằng mã</Text>
    <Text style={[styles.hint, { color: theme.textSecondary }]}>Quét sản phẩm hoặc vị trí, chọn đúng lô rồi nhập số thực đếm.</Text>
    <View style={styles.actions}>
      <ScanCodeButton label="Quét sản phẩm" title="Quét sản phẩm thuộc phiếu kiểm kê" onScan={(code) => scan('Product', code)} />
      <ScanCodeButton label="Quét vị trí" title="Quét vị trí thuộc phiếu kiểm kê" onScan={(code) => scan('Location', code)} />
    </View>
    {match && <>
      <AlertBanner title={`Tìm thấy ${match.items.length} dòng chưa đếm`} description={`Mã: ${match.code}. Quét không tự tăng số đếm hoặc lưu kết quả.`} />
      <SelectionField label="Chọn đúng vị trí và lô" value={selected} onChange={setSelected}
        options={match.items.map((line) => ({ value: line.id, label: `${line.productSku} · ${line.slotCode}`,
          description: `${line.productName} · Lô ${line.lotNumber ?? 'không áp dụng'} · ${line.qualityStatus === 'Good' ? 'Hàng đạt' : line.qualityStatus === 'Damaged' ? 'Hàng hỏng' : 'Hàng cách ly'}` }))} />
      <Button label="Nhập số đếm cho dòng đã chọn" disabled={!item}
        onPress={() => { if (item) onRecord(item, match.kind === 'Product' ? match.code : undefined); }} />
      <Button label="Xóa kết quả quét" variant="ghost" onPress={() => { setMatch(null); setSelected(''); }} />
    </>}
  </View>;
}
const styles = StyleSheet.create({ root: { padding: 14, borderWidth: 1, borderRadius: 12, gap: 12 },
  title: { fontFamily: FontFamily.semibold, fontSize: 16 }, hint: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
