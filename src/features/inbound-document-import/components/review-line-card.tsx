import { memo } from 'react';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

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
}

function ReviewLineCardBase({ index, line, control, errors, options, isLotTracked, disabled, onSelectItem }: ReviewLineCardProps) {
  const theme = useTheme();
  const lineErrors = errors?.[index];
  const status = STATUS[line.status] ?? { label: 'Cần xử lý', tone: 'danger' as const };
  const extracted = [line.extractedSku, line.extractedProductName].filter(Boolean).join(' · ') || 'AI không đọc được tên hàng';
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={styles.top}>
      <Text style={[styles.heading, { color: theme.text }]}>Dòng {line.sourceLineNumber}</Text>
      <View style={styles.pills}>
        {line.isUserCorrected && <StatusPill label="Đã hiệu chỉnh" tone="primary" />}
        <StatusPill label={status.label} tone={status.tone} />
      </View>
    </View>
    <Text style={[styles.text, { color: theme.textSecondary }]}>
      Trên phiếu: {extracted}{line.documentQuantity !== null ? ` · SL ${line.documentQuantity}` : ''}{line.extractedUnitOfMeasure ? ` ${line.extractedUnitOfMeasure}` : ''}
    </Text>
    {line.orderedQuantity !== null && <Text style={[styles.text, { color: theme.textSecondary }]}>
      Theo đơn: đặt {line.orderedQuantity} · đã nhận {line.previouslyReceivedQuantity ?? 0} · còn {line.remainingQuantity ?? 0} {line.unitName ?? ''}
    </Text>}
    <Controller control={control} name={`lines.${index}.inboundRequestItemId`} render={({ field }) => <View style={styles.field}>
      <SelectionField label="Dòng hàng trong yêu cầu nhập" value={field.value} options={options} disabled={disabled}
        placeholder="Chọn sản phẩm khớp" onChange={value => onSelectItem(index, value)} />
      {lineErrors?.inboundRequestItemId?.message && <Text style={[styles.error, { color: theme.error }]}>{lineErrors.inboundRequestItemId.message}</Text>}
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
    {isLotTracked && <>
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
    </>}
  </View>;
}
export const ReviewLineCard = memo(ReviewLineCardBase);

const styles = StyleSheet.create({
  card: { gap: 10, padding: 16, borderWidth: 1, borderRadius: Radius.xl },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pills: { flexDirection: 'row', gap: 6, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },
  heading: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 },
  error: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  field: { gap: 4 }, row: { flexDirection: 'row', gap: 10 }, flex: { flex: 1 },
});
