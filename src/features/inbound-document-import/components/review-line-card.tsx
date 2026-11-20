import { Trash2 } from 'lucide-react-native';
import { memo } from 'react';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SelectionField, type SelectionOption } from '@/components/ui/selection-field';
import { StatusPill, type PillTone } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { DocumentReviewLine, ReviewForm } from '../inbound-document-import.schema';

const STATUS: Readonly<Record<string, { label: string; tone: PillTone }>> = {
  Matched: { label: 'Khớp', tone: 'success' },
  Shortage: { label: 'Giao thiếu', tone: 'warning' },
};

interface ReviewLineCardProps {
  readonly index: number;
  readonly line: DocumentReviewLine;
  readonly control: Control<ReviewForm>;
  readonly errors?: FieldErrors<ReviewForm>['lines'];
  readonly options: readonly SelectionOption[];
  readonly isLotTracked: boolean;
  readonly disabled: boolean;
  readonly onSelectItem: (index: number, itemId: string) => void;
  /** Only lines the reviewer added can be removed; lines printed on the document must stay. */
  readonly onRemove?: (index: number) => void;
}

function ReviewLineCardBase({ index, line, control, errors, options, isLotTracked, disabled, onSelectItem, onRemove }: ReviewLineCardProps) {
  const theme = useTheme();
  const lineErrors = errors?.[index];
  const status = STATUS[line.status] ?? { label: 'Cần xử lý', tone: 'danger' as const };
  const name = line.isManuallyAdded ? 'Dòng hàng thêm thủ công' : line.extractedProductName || line.extractedSku;
  const kicker = [`Dòng ${line.sourceLineNumber}`, line.extractedProductName ? line.extractedSku : null].filter(Boolean).join(' · ');
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={styles.top}>
      <Text style={[styles.kicker, { color: theme.textSecondary }]} numberOfLines={1}>{kicker}</Text>
      <View style={styles.pills}>
        {line.isManuallyAdded ? <StatusPill label="Thêm thủ công" tone="primary" />
          : line.isUserCorrected ? <StatusPill label="Đã hiệu chỉnh" tone="primary" /> : null}
        {line.status ? <StatusPill label={status.label} tone={status.tone} /> : null}
        {onRemove ? <Pressable accessibilityRole="button" accessibilityLabel={`Xoá dòng ${line.sourceLineNumber}`} hitSlop={8}
          disabled={disabled} onPress={() => onRemove(index)} style={styles.remove}>
          <Trash2 size={18} color={disabled ? theme.textSecondary : theme.error} />
        </Pressable> : null}
      </View>
    </View>
    <Text style={[styles.title, { color: name ? theme.text : theme.textSecondary }]}>{name || 'AI không đọc được tên hàng'}</Text>
    <View style={[styles.compare, { backgroundColor: theme.backgroundElement }]}>
      <Stat label="Trên phiếu" value={line.documentQuantity === null ? '—' : String(line.documentQuantity)} unit={line.extractedUnitOfMeasure} />
      {line.orderedQuantity !== null ? <>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Stat label="Còn theo đơn" value={String(line.remainingQuantity ?? 0)} unit={line.unitName}
          detail={`Đặt ${line.orderedQuantity} · đã nhận ${line.previouslyReceivedQuantity ?? 0}`} />
      </> : null}
    </View>
    <Controller control={control} name={`lines.${index}.inboundRequestItemId`} render={({ field }) => <View style={styles.field}>
      <SelectionField label="Dòng hàng trong yêu cầu nhập" value={field.value} options={options} disabled={disabled}
        placeholder="Chọn sản phẩm khớp" onChange={value => onSelectItem(index, value)} />
      {lineErrors?.inboundRequestItemId?.message
        ? <Text style={[styles.error, { color: theme.error }]}>{lineErrors.inboundRequestItemId.message}</Text> : null}
    </View>} />
    <View style={styles.row}>
      <Controller control={control} name={`lines.${index}.confirmedQuantity`} render={({ field }) => <View style={styles.flex}>
        <TextField label="Số xác nhận" keyboardType="decimal-pad" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          editable={!disabled} error={lineErrors?.confirmedQuantity?.message} />
      </View>} />
      <Controller control={control} name={`lines.${index}.damagedQuantity`} render={({ field }) => <View style={styles.flex}>
        <TextField label="Số hỏng" keyboardType="decimal-pad" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          editable={!disabled} error={lineErrors?.damagedQuantity?.message} />
      </View>} />
    </View>
    <Controller control={control} name={`lines.${index}.exceptionReason`} render={({ field }) => <TextField label="Lý do ngoại lệ"
      value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} editable={!disabled} placeholder="Bắt buộc khi có hàng hỏng"
      error={lineErrors?.exceptionReason?.message} />} />
    {isLotTracked ? <View style={[styles.section, { borderTopColor: theme.border }]}>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Thông tin lô</Text>
      <Controller control={control} name={`lines.${index}.lotNumber`} render={({ field }) => <TextField label="Số lô"
        value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} editable={!disabled} autoCapitalize="characters"
        error={lineErrors?.lotNumber?.message} />} />
      <View style={styles.row}>
        <Controller control={control} name={`lines.${index}.manufacturedDate`} render={({ field }) => <View style={styles.flex}>
          <TextField label="Ngày sản xuất" placeholder="YYYY-MM-DD" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            editable={!disabled} error={lineErrors?.manufacturedDate?.message} />
        </View>} />
        <Controller control={control} name={`lines.${index}.expiryDate`} render={({ field }) => <View style={styles.flex}>
          <TextField label="Hạn dùng" placeholder="YYYY-MM-DD" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            editable={!disabled} error={lineErrors?.expiryDate?.message} />
        </View>} />
      </View>
    </View> : null}
  </View>;
}
export const ReviewLineCard = memo(ReviewLineCardBase);

interface StatProps {
  readonly label: string;
  readonly value: string;
  readonly unit?: string | null;
  readonly detail?: string;
}

function Stat({ label, value, unit, detail }: StatProps) {
  const theme = useTheme();
  return <View style={styles.stat}>
    <Text style={[styles.caption, { color: theme.textSecondary }]}>{label}</Text>
    <Text style={[styles.value, { color: theme.text }]}>
      {value}{unit ? <Text style={[styles.unit, { color: theme.textSecondary }]}>{` ${unit}`}</Text> : null}
    </Text>
    {detail ? <Text style={[styles.caption, { color: theme.textSecondary }]}>{detail}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderWidth: 1, borderRadius: Radius.xl },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  kicker: { flex: 1, fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 18 },
  pills: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
  title: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 },
  compare: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: Radius.lg },
  divider: { width: 1, alignSelf: 'stretch' },
  stat: { flex: 1, gap: 4 },
  caption: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16 },
  value: { fontFamily: FontFamily.semibold, fontSize: 20, lineHeight: 28, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: FontFamily.regular, fontSize: 13 },
  error: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  section: { gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  sectionLabel: { fontFamily: FontFamily.semibold, fontSize: 13, lineHeight: 18 },
  remove: { padding: 4 },
  field: { gap: 4 }, row: { flexDirection: 'row', gap: 12 }, flex: { flex: 1 },
});
