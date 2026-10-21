import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FilterChips, type FilterOption } from '@/components/ui/filter-chips';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate } from '@/lib/date-format';

import { isOffPlan, lotRemaining, type ReceiveDraft } from '../transfer-tasks.logic';
import { DEVIATION_REASON_LABEL, RECEIPT_REASON_LABEL } from '../transfer-tasks.types';

export type ReceiveDraftPatch = Partial<
  Pick<ReceiveDraft, 'good' | 'damaged' | 'missing' | 'reasonCode' | 'deviationReasonCode' | 'note'>
>;

interface ReceiveEntryCardProps {
  readonly draft: ReceiveDraft;
  readonly onChange: (key: string, patch: ReceiveDraftPatch) => void;
  readonly onScan: (key: string) => void;
}

const REASON_OPTIONS: readonly FilterOption<string>[] = Object.entries(RECEIPT_REASON_LABEL).map(
  ([value, label]) => ({ value, label }),
);
const DEVIATION_OPTIONS: readonly FilterOption<string>[] = Object.entries(DEVIATION_REASON_LABEL).map(
  ([value, label]) => ({ value, label }),
);

const formatQuantity = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

export const ReceiveEntryCard = memo(function ReceiveEntryCard({ draft, onChange, onScan }: ReceiveEntryCardProps) {
  const theme = useTheme();
  const { line, lot } = draft;
  const unit = line.baseUnitName ?? '';
  const needsReason = Number(draft.damaged.replace(',', '.')) > 0 || Number(draft.missing.replace(',', '.')) > 0;
  const offPlan = isOffPlan(draft);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
        {line.productName}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {line.sku} · {lot.lotNumber ? `Lô ${lot.lotNumber}` : 'Theo số lượng'}
        {lot.expiryDate ? ` · HSD ${formatDisplayDate(new Date(lot.expiryDate))}` : ''}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        Cần nhận {formatQuantity(lotRemaining(lot))} {unit}
        {line.suggestedSlotCode ? ` · Gợi ý ô ${line.suggestedSlotCode}` : ''}
      </Text>

      <View style={styles.slotRow}>
        <View style={styles.slotText}>
          <Text style={[styles.meta, { color: draft.slot ? theme.primary : theme.textSecondary }]}>
            {draft.slot ? `Vị trí: ${draft.slot.path || draft.slot.code}` : 'Chưa quét vị trí đặt hàng'}
          </Text>
        </View>
        {draft.slot ? <StatusPill label="Đã quét" tone="success" /> : null}
      </View>
      <Button
        label={draft.slot ? 'Quét lại vị trí' : 'Quét vị trí đặt hàng'}
        variant="outline"
        onPress={() => onScan(draft.key)}
      />

      <TextField
        label="Nhận tốt"
        keyboardType="decimal-pad"
        value={draft.good}
        onChangeText={(value) => onChange(draft.key, { good: value })}
      />
      <TextField
        label="Hỏng"
        keyboardType="decimal-pad"
        value={draft.damaged}
        onChangeText={(value) => onChange(draft.key, { damaged: value })}
      />
      <TextField
        label="Thiếu"
        keyboardType="decimal-pad"
        value={draft.missing}
        onChangeText={(value) => onChange(draft.key, { missing: value })}
      />

      {needsReason ? (
        <>
          <Text style={[styles.section, { color: theme.text }]}>Lý do hỏng hoặc thiếu</Text>
          <FilterChips
            accessibilityLabel="Lý do hỏng hoặc thiếu"
            options={REASON_OPTIONS}
            value={draft.reasonCode}
            onChange={(value) => onChange(draft.key, { reasonCode: value })}
            allLabel="Chưa chọn"
          />
        </>
      ) : null}

      {offPlan ? (
        <>
          <Text style={[styles.section, { color: theme.warning }]}>Vị trí khác kế hoạch cất hàng</Text>
          <FilterChips
            accessibilityLabel="Lý do đặt khác kế hoạch"
            options={DEVIATION_OPTIONS}
            value={draft.deviationReasonCode}
            onChange={(value) => onChange(draft.key, { deviationReasonCode: value })}
            allLabel="Chưa chọn"
          />
        </>
      ) : null}

      {offPlan || needsReason ? (
        <TextField
          label="Ghi chú"
          multiline
          maxLength={500}
          value={draft.note}
          onChangeText={(value) => onChange(draft.key, { note: value })}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { gap: 10, padding: 14, borderWidth: 1, borderRadius: Radius.xl },
  name: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 21 },
  meta: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  section: { fontFamily: FontFamily.semibold, fontSize: 13 },
  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  slotText: { flex: 1 },
});
