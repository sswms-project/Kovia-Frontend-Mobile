import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { TextField } from '@/components/ui/text-field';
import { formatQuantity } from '@/lib/number-format';
import { formatInventoryLocation } from '@/features/inventory/inventory.labels';
import type { usePutawayAllocation } from '../../hooks/use-putaway-allocation';
import type { PutAwaySuggestions, Receipt } from '../../receiving.schema';
import { putawayScanKey } from '../../putaway-allocation';
import { parseQuantity, quantityInput } from './receipt-line-fields';

interface Props {
  readonly item: Receipt['items'][number]; readonly state: ReturnType<typeof usePutawayAllocation>;
  readonly suggestions: PutAwaySuggestions | null; readonly suggesting: boolean; readonly onSuggest: () => void;
  readonly onShowReason: () => void;
}
export function PutawayAllocationItem({ item, state, suggestions, suggesting, onSuggest, onShowReason }: Props) {
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const locked = state.frozen || state.mutation.isPending;
  const entries = state.fields.fields.flatMap((field, index) => state.values.lines[index]?.goodsReceiptItemId === item.id ? [{ field, index, line: state.values.lines[index] }] : []);
  const assigned = (state.allocation?.totals.get(item.id) ?? 0) / 100;
  const diff = Math.round((item.remainingPutAwayQuantity - assigned) * 100) / 100;
  const Chevron = collapsed ? ChevronRight : ChevronDown;
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${collapsed ? 'Mở' : 'Thu gọn'} ${item.productSKU}`}
      accessibilityState={{ expanded: !collapsed }} onPress={() => setCollapsed(!collapsed)} style={styles.heading}>
      <View style={styles.headingText}>
        <Text style={[styles.name, { color: theme.text }]}>{item.productSKU} · {item.productName}</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Còn phải cất {formatQuantity(item.remainingPutAwayQuantity, 6)} {item.baseUnitName}</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Đang phân bổ {formatQuantity(assigned, 6)} {item.baseUnitName} vào {entries.length} vị trí</Text>
      </View>
      <Chevron size={20} color={theme.primary} />
    </Pressable>
    <Text style={[styles.name, { color: diff < 0 ? theme.error : theme.primary }]}>
      {diff === 0 ? 'Đã phân bổ đủ' : `${diff < 0 ? 'Vượt' : 'Còn thiếu'} ${formatQuantity(Math.abs(diff), 6)} ${item.baseUnitName}`}
    </Text>
    {collapsed && <Text style={[styles.text, { color: theme.textSecondary }]}>{entries.map(({ line }) => `${line.destination?.displayPath ?? 'Chưa chọn vị trí'} × ${quantityInput(line.enteredQuantity)}`).join('; ')}</Text>}
    {!collapsed && entries.map(({ field, index, line }) => {
      const row = state.allocation?.rows[index];
      const suggestionItems = state.picking === index ? suggestions?.items.find(value => value.goodsReceiptItemId === item.id)?.suggestions : null;
      return <View key={field.id} style={[styles.line, { borderColor: theme.border }]}>
        <Text style={[styles.name, { color: theme.text }]}>Cất vào vị trí</Text>
        <Button label={line.destination?.displayPath ?? 'Chọn kệ hoặc vị trí cất'} variant="outline" disabled={locked} onPress={() => state.pick(index)} />
        {line.destination?.capacityLabel && <Text style={[styles.text, { color: theme.textSecondary }]}>{line.destination.capacityLabel}</Text>}
        <Button label="Gợi ý vị trí cho sản phẩm này" variant="ghost" disabled={locked || suggesting} loading={suggesting && state.picking === index}
          onPress={() => { state.suggest(index); onSuggest(); }} />
        {suggestionItems?.slice(0, 3).map(suggestion => <View key={suggestion.slotId} style={styles.group}>
          <Button label={`${suggestion.zoneName} · ${formatInventoryLocation(suggestion)}`} variant="outline" disabled={locked}
            onPress={() => state.chooseSuggestion(suggestions, item.id, suggestion.slotId)} />
          <Text style={[styles.text, { color: theme.textSecondary }]}>{suggestion.reason} · Đề xuất {formatQuantity(suggestion.suggestedQuantity, 6)} {item.baseUnitName}</Text>
          {suggestion.warnings.length > 0 && <AlertBanner title={suggestion.warnings.join(' · ')} />}
        </View>)}
        {suggestionItems?.length === 0 && <Text style={[styles.text, { color: theme.textSecondary }]}>Chưa có gợi ý phù hợp; bạn có thể chọn vị trí bằng tay.</Text>}
        <Controller control={state.form.control} name={`lines.${index}.enteredQuantity`} render={({ field: input, fieldState }) => <TextField
          label="Số lượng cất" value={quantityInput(input.value)} keyboardType="decimal-pad" editable={!locked}
          onChangeText={text => input.onChange(parseQuantity(text))} onBlur={input.onBlur} error={fieldState.error?.message} />} />
        <Text style={[styles.name, { color: theme.text }]}>Đơn vị cất</Text>
        <View style={styles.units}>{item.allowedUnits.map(unit => <Pressable key={unit.unitId} accessibilityRole="button"
          accessibilityLabel={`Đơn vị ${unit.unitName}`} accessibilityState={{ selected: line.enteredUnitId === unit.unitId, disabled: locked }}
          disabled={locked} onPress={() => state.changeUnit(index, unit.unitId)}
          style={[styles.unit, { borderColor: line.enteredUnitId === unit.unitId ? theme.primary : theme.border, backgroundColor: line.enteredUnitId === unit.unitId ? theme.primaryContainer : theme.card }]}>
          <Text style={[styles.text, { color: theme.text }]}>{unit.unitName}</Text>
        </Pressable>)}</View>
        <Text style={[styles.text, { color: theme.textSecondary }]}>= {row?.baseQuantity === null ? 'Chưa quy đổi được' : `${formatQuantity(row?.baseQuantity ?? 0, 6)} ${item.baseUnitName}`}</Text>
        <Text style={[styles.text, { color: row?.offPlan ? theme.error : theme.primary }]}>{item.putAwayPlan.length ? row?.offPlan ? 'Khác kế hoạch · cần lý do' : 'Theo kế hoạch' : 'Chưa có kế hoạch vị trí'}</Text>
        {row?.offPlan && <Button label="Nhập lý do cất khác kế hoạch" variant="outline" disabled={locked} onPress={onShowReason} />}
        {line.destination && <>
          <Text style={[styles.text, { color: row?.confirmed ? theme.primary : theme.textSecondary }]}>{row?.confirmed
            ? `Đã ghi nhận mã: ${state.scans[putawayScanKey(line)]}${row.serverCheck ? ' · BE sẽ đối chiếu khi xác nhận cất hàng' : ''}` : 'Chưa quét mã vị trí'}</Text>
          <ScanCodeButton label="Quét mã vị trí này" title={`Xác nhận vị trí · ${item.productSKU}`} disabled={locked}
            status={state.notice ?? undefined} onScan={code => state.scan(code, index)} />
          {row?.confirmed && <Button label="Bỏ xác nhận mã" variant="ghost" disabled={locked} onPress={() => state.clearScan(index)} />}
        </>}
        {row?.error && <AlertBanner variant="destructive" title={row.error} />}
        <View style={styles.group}>
          <Button label="Điền số lượng còn lại" variant="outline" disabled={locked} onPress={() => state.fill(index)} />
          <Button label="Xóa phân bổ này" variant="ghost" disabled={locked} onPress={() => state.remove(index)} />
        </View>
      </View>;
    })}
    <Button label="Chia sang vị trí khác" variant="outline" disabled={locked} onPress={() => { setCollapsed(false); state.add(item.id); }} />
  </View>;
}
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 }, headingText: { flex: 1 },
  name: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 23 }, text: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 20 },
  line: { borderTopWidth: 1, paddingTop: 16, gap: 10 }, group: { gap: 8 }, units: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unit: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderRadius: Radius.md, justifyContent: 'center' } });
