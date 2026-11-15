import { Camera, ImageIcon, Square, SquareCheck } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { DocumentImport, DocumentReview, ExtractedTextField } from '../inbound-document-import.schema';

const SOURCE_LABELS: Readonly<Record<string, string>> = {
  AiExtracted: 'AI trích xuất', DocumentParser: 'Đọc từ tệp', InboundRequest: 'Yêu cầu nhập kho', SupplierMaster: 'Danh mục NCC',
  WarehouseMaster: 'Danh mục kho', SystemGenerated: 'Hệ thống', UserEdited: 'Người dùng sửa',
};
const VERIFICATION_LABELS: Readonly<Record<string, string>> = {
  Unverified: 'Chưa xác nhận', Matched: 'Đã đối chiếu', LowConfidence: 'Cần kiểm tra', Mismatch: 'Không khớp',
  UserConfirmed: 'Đã xác nhận', UserCorrected: 'Đã hiệu chỉnh', NotProvided: 'Không có dữ liệu',
};

interface UploadPanelProps { readonly busy: boolean; readonly onPick: (source: 'camera' | 'library') => void }
export function UploadPanel({ busy, onPick }: UploadPanelProps) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Text style={[styles.heading, { color: theme.text }]}>Chụp phiếu giao hàng</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>
      Chụp thẳng, đủ sáng, thấy rõ số phiếu và bảng hàng. Ảnh JPG hoặc PNG, tối đa 10 MB. AI chỉ gợi ý, bạn rà soát trước khi tạo phiếu.
    </Text>
    <Button label="Chụp ảnh phiếu" loading={busy} disabled={busy} onPress={() => onPick('camera')}
      renderIcon={color => <Camera size={18} color={color} />} />
    <Button label="Chọn ảnh có sẵn" variant="outline" disabled={busy} onPress={() => onPick('library')}
      renderIcon={color => <ImageIcon size={18} color={color} />} />
  </View>;
}

interface FailedPanelProps { readonly item: DocumentImport; readonly onRetry: () => void; readonly onManual: () => void }
export function FailedPanel({ item, onRetry, onManual }: FailedPanelProps) {
  return <AlertBanner variant="destructive"
    title={item.failureCode === 'ProviderQuotaExceeded' ? 'Đã hết hạn mức phân tích AI' : 'Không thể phân tích chứng từ'}
    description={item.failureMessage ?? 'Bạn có thể chụp lại ảnh rõ hơn hoặc nhập thủ công.'}>
    <Button label="Chọn tệp khác" onPress={onRetry} />
    <Button label="Tiếp tục nhập thủ công" variant="outline" onPress={onManual} />
  </AlertBanner>;
}

function FieldRow({ label, field, fallback }: { readonly label: string; readonly field?: ExtractedTextField; readonly fallback?: string | null }) {
  const theme = useTheme();
  const value = field?.value ?? fallback ?? null;
  const meta = field ? [SOURCE_LABELS[field.source] ?? field.source, VERIFICATION_LABELS[field.verificationStatus] ?? field.verificationStatus] : [];
  const warn = field?.verificationStatus === 'Mismatch' || field?.verificationStatus === 'LowConfidence';
  return <View style={styles.row}>
    <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    <View style={styles.valueBox}>
      <Text style={[styles.value, { color: theme.text }]}>{value ?? '—'}</Text>
      {meta.length > 0 && <Text style={[styles.meta, { color: warn ? theme.error : theme.textSecondary }]}>{meta.join(' · ')}</Text>}
    </View>
  </View>;
}

/** OCR can misread Vietnamese diacritics; lets the user retype the name. Display-only: the supplier of record comes from the PO. */
function EditableSupplierRow({ field, fallback }: { readonly field?: ExtractedTextField; readonly fallback?: string | null }) {
  const theme = useTheme();
  const original = field?.value ?? fallback ?? '';
  const [value, setValue] = useState(original);
  const edited = value.trim() !== original.trim();
  return <View style={styles.group}>
    <FieldRowLabelled label="Nhà cung cấp">
      <TextField label="Nhà cung cấp" hideLabel value={value} onChangeText={setValue} autoCapitalize="words"
        hint={`${edited ? 'Đã chỉnh sửa' : 'Sửa nếu OCR đọc sai'} · chỉ để đối chiếu, nhà cung cấp theo yêu cầu nhập kho`} />
    </FieldRowLabelled>
    {edited && <Text style={[styles.meta, { color: theme.textSecondary }]}>Gốc: {original || '—'}</Text>}
  </View>;
}

function FieldRowLabelled({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  const theme = useTheme();
  return <View style={styles.row}>
    <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    <View style={styles.flex}>{children}</View>
  </View>;
}

interface ReviewHeaderProps {
  readonly item: DocumentImport;
  readonly review: DocumentReview;
  readonly acknowledged: boolean;
  readonly onAcknowledge: (value: boolean) => void;
}
export function ReviewHeader({ item, review, acknowledged, onAcknowledge }: ReviewHeaderProps) {
  const theme = useTheme();
  const extraction = review.extraction;
  return <View style={styles.group}>
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.heading, { color: theme.text }]}>Thông tin chứng từ</Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
        {item.fileName}{item.extractionModel ? ` · ${item.extractionModel}` : ''}
      </Text>
      <FieldRow label="Số chứng từ" field={extraction?.documentNumber} />
      <FieldRow label="Mã yêu cầu" field={extraction?.inboundRequestCode} fallback={review.inboundRequestCode} />
      <FieldRow label="Ngày chứng từ" field={extraction?.documentDate} />
      <FieldRow label="Ngày giao" field={extraction?.supplierDeliveryDate} />
      <EditableSupplierRow key={item.id} field={extraction?.supplierName} fallback={review.supplierName} />
      <FieldRow label="Mã kho" field={extraction?.warehouseCode} fallback={review.warehouseCode} />
      <FieldRow label="Tên kho" field={extraction?.warehouseName} fallback={review.warehouseName} />
    </View>
    {item.duplicateFileDetected && <AlertBanner title="Tệp này đã từng được tải lên trước đó." />}
    {review.blockingErrors.length > 0 && <AlertBanner variant="destructive" title="Lỗi cần xử lý" description={review.blockingErrors.join('\n')} />}
    {review.warnings.length > 0 && <AlertBanner title="Cảnh báo" description={review.warnings.join('\n')} />}
    {review.hasWarehouseMismatch && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acknowledged }}
      onPress={() => onAcknowledge(!acknowledged)} style={[styles.check, { borderColor: theme.border }]}>
      {acknowledged ? <SquareCheck size={22} color={theme.primary} /> : <Square size={22} color={theme.textSecondary} />}
      <Text style={[styles.text, styles.flex, { color: theme.text }]}>
        Tôi xác nhận sử dụng {review.warehouseCode} · {review.warehouseName} theo đơn mua.
      </Text>
    </Pressable>}
    <Text style={[styles.text, { color: theme.textSecondary }]}>
      Số xác nhận gồm hàng đạt và hàng từ chối. Phần hỏng được chuyển thành số từ chối.
    </Text>
  </View>;
}

const styles = StyleSheet.create({
  group: { gap: 12 }, flex: { flex: 1 },
  card: { gap: 10, padding: 16, borderWidth: 1, borderRadius: Radius.xl },
  heading: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 26 },
  text: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 },
  row: { flexDirection: 'row', gap: 12 }, valueBox: { flex: 1, alignItems: 'flex-end' },
  label: { width: 110, fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  value: { fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 20, textAlign: 'right' },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17, textAlign: 'right' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, padding: 12, borderWidth: 1, borderRadius: Radius.md },
});
