import { Camera, Check, FileText, FileWarning, ImageIcon, Info, RefreshCw, ScanText, Square, SquareCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { StatusPill, type PillTone } from '@/components/ui/status-pill';
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
const VERIFICATION_TONES: Readonly<Record<string, PillTone>> = {
  Matched: 'success', UserConfirmed: 'success', UserCorrected: 'primary', LowConfidence: 'warning', Mismatch: 'danger',
};
const UPLOAD_TIPS = ['Chụp thẳng, đủ sáng, không bị lóa', 'Thấy rõ số phiếu và toàn bộ bảng hàng', 'Ảnh JPG hoặc PNG, tối đa 10 MB'] as const;

const bullets = (items: readonly string[]) => (items.length > 1 ? items.map(item => `• ${item}`).join('\n') : items[0]);

interface UploadPanelProps { readonly busy: boolean; readonly onPick: (source: 'camera' | 'library') => void }
export function UploadPanel({ busy, onPick }: UploadPanelProps) {
  const theme = useTheme();
  return <View style={[styles.card, styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={styles.hero}>
      <View style={[styles.badge, { backgroundColor: theme.primaryContainer }]}>
        <ScanText size={30} color={theme.onPrimaryContainer} />
      </View>
      <Text style={[styles.heading, styles.center, { color: theme.text }]}>Chụp phiếu giao hàng</Text>
      <Text style={[styles.body, styles.center, { color: theme.textSecondary }]}>
        AI đọc số phiếu và bảng hàng để gợi ý, bạn rà soát lại trước khi tạo phiếu nhận.
      </Text>
    </View>
    <View style={[styles.tips, { backgroundColor: theme.backgroundElement }]}>
      {UPLOAD_TIPS.map(tip => <View key={tip} style={styles.tip}>
        <Check size={16} strokeWidth={2.5} color={theme.primary} />
        <Text style={[styles.small, styles.flex, { color: theme.text }]}>{tip}</Text>
      </View>)}
    </View>
    <View style={styles.actions}>
      <Button label="Chụp ảnh phiếu" loading={busy} disabled={busy} onPress={() => onPick('camera')}
        renderIcon={color => <Camera size={18} color={color} />} />
      <Button label="Chọn ảnh có sẵn" variant="outline" disabled={busy} onPress={() => onPick('library')}
        renderIcon={color => <ImageIcon size={18} color={color} />} />
    </View>
  </View>;
}

interface FailedPanelProps { readonly item: DocumentImport; readonly onRetry: () => void; readonly onManual: () => void }
export function FailedPanel({ item, onRetry, onManual }: FailedPanelProps) {
  const theme = useTheme();
  return <View style={[styles.card, styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={styles.hero}>
      <View style={[styles.badge, { backgroundColor: theme.errorContainer }]}>
        <FileWarning size={28} color={theme.onErrorContainer} />
      </View>
      <Text style={[styles.heading, styles.center, { color: theme.text }]}>
        {item.failureCode === 'ProviderQuotaExceeded' ? 'Đã hết hạn mức phân tích AI' : 'Không thể phân tích chứng từ'}
      </Text>
      <Text style={[styles.body, styles.center, { color: theme.textSecondary }]}>
        {item.failureMessage ?? 'Bạn có thể chụp lại ảnh rõ hơn hoặc nhập thủ công.'}
      </Text>
    </View>
    <View style={styles.actions}>
      <Button label="Chọn tệp khác" onPress={onRetry} renderIcon={color => <RefreshCw size={18} color={color} />} />
      <Button label="Tiếp tục nhập thủ công" variant="outline" onPress={onManual} />
    </View>
  </View>;
}

function VerificationPill({ field }: { readonly field: NonNullable<ExtractedTextField> }) {
  return <StatusPill label={VERIFICATION_LABELS[field.verificationStatus] ?? field.verificationStatus}
    tone={VERIFICATION_TONES[field.verificationStatus] ?? 'neutral'} />;
}

function FieldLabel({ label, field }: { readonly label: string; readonly field?: ExtractedTextField }) {
  const theme = useTheme();
  return <View style={styles.fieldLabel}>
    <Text style={[styles.caption, { color: theme.textSecondary }]}>{label}</Text>
    {field ? <Text style={[styles.meta, { color: theme.textSecondary }]}>{SOURCE_LABELS[field.source] ?? field.source}</Text> : null}
  </View>;
}

function FieldRow({ label, field, fallback }: { readonly label: string; readonly field?: ExtractedTextField; readonly fallback?: string | null }) {
  const theme = useTheme();
  const value = field?.value ?? fallback ?? null;
  return <View style={[styles.fieldRow, { borderTopColor: theme.border }]}>
    <FieldLabel label={label} field={field} />
    <View style={styles.fieldValue}>
      <Text style={[styles.value, { color: value ? theme.text : theme.textSecondary }]}>{value ?? '—'}</Text>
      {field ? <VerificationPill field={field} /> : null}
    </View>
  </View>;
}

/** OCR can misread Vietnamese diacritics; lets the user retype the name. Display-only: the supplier of record comes from the PO. */
function EditableSupplierRow({ field, fallback }: { readonly field?: ExtractedTextField; readonly fallback?: string | null }) {
  const theme = useTheme();
  const original = field?.value ?? fallback ?? '';
  const [value, setValue] = useState(original);
  const edited = value.trim() !== original.trim();
  return <View style={[styles.fieldStack, { borderTopColor: theme.border }]}>
    <View style={styles.fieldHead}>
      <FieldLabel label="Nhà cung cấp" field={field} />
      {edited ? <StatusPill label="Đã chỉnh sửa" tone="primary" /> : field ? <VerificationPill field={field} /> : null}
    </View>
    <TextField label="Nhà cung cấp" hideLabel value={value} onChangeText={setValue} autoCapitalize="words"
      hint={`${edited ? 'Đã chỉnh sửa' : 'Sửa nếu OCR đọc sai'} · chỉ để đối chiếu, nhà cung cấp theo yêu cầu nhập kho`} />
    {edited ? <Text style={[styles.meta, { color: theme.textSecondary }]}>Gốc: {original || '—'}</Text> : null}
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
  const file = [item.fileName, item.extractionModel].filter(Boolean).join(' · ');
  return <View style={styles.group}>
    <View style={[styles.card, styles.details, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHead}>
        <Text style={[styles.heading, { color: theme.text }]}>Thông tin chứng từ</Text>
        {file ? <View style={[styles.fileChip, { backgroundColor: theme.backgroundElement }]}>
          <FileText size={14} color={theme.textSecondary} />
          <Text style={[styles.meta, styles.shrink, { color: theme.textSecondary }]} numberOfLines={1}>{file}</Text>
        </View> : null}
      </View>
      <View>
        <FieldRow label="Số chứng từ" field={extraction?.documentNumber} />
        <FieldRow label="Mã yêu cầu" field={extraction?.inboundRequestCode} fallback={review.inboundRequestCode} />
        <FieldRow label="Ngày chứng từ" field={extraction?.documentDate} />
        <FieldRow label="Ngày giao" field={extraction?.supplierDeliveryDate} />
        <EditableSupplierRow key={item.id} field={extraction?.supplierName} fallback={review.supplierName} />
        <FieldRow label="Mã kho" field={extraction?.warehouseCode} fallback={review.warehouseCode} />
        <FieldRow label="Tên kho" field={extraction?.warehouseName} fallback={review.warehouseName} />
      </View>
    </View>
    {item.duplicateFileDetected && <AlertBanner title="Tệp này đã từng được tải lên trước đó." />}
    {review.blockingErrors.length > 0 && <AlertBanner variant="destructive" title={`Lỗi cần xử lý (${review.blockingErrors.length})`}
      description={bullets(review.blockingErrors)} />}
    {review.warnings.length > 0 && <AlertBanner title={`Cảnh báo (${review.warnings.length})`} description={bullets(review.warnings)} />}
    {review.hasWarehouseMismatch && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acknowledged }}
      onPress={() => onAcknowledge(!acknowledged)}
      style={({ pressed }) => [styles.check, acknowledged
        ? { backgroundColor: theme.card, borderColor: theme.primary }
        : { backgroundColor: theme.warningContainer, borderColor: theme.warningContainer }, pressed && styles.pressed]}>
      {acknowledged ? <SquareCheck size={22} color={theme.primary} /> : <Square size={22} color={theme.onWarningContainer} />}
      <Text style={[styles.body, styles.flex, { color: acknowledged ? theme.text : theme.onWarningContainer }]}>
        Tôi xác nhận sử dụng {review.warehouseCode} · {review.warehouseName} theo đơn mua.
      </Text>
    </Pressable>}
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[styles.heading, styles.shrink, { color: theme.text }]}>Dòng hàng trên phiếu</Text>
        <StatusPill label={`${review.lines.length} dòng`} tone="neutral" />
      </View>
      <View style={styles.note}>
        <Info size={16} color={theme.textSecondary} style={styles.noteIcon} />
        <Text style={[styles.small, styles.flex, { color: theme.textSecondary }]}>
          Số xác nhận gồm hàng đạt và hàng từ chối. Phần hỏng được chuyển thành số từ chối.
        </Text>
      </View>
    </View>
    {review.lines.length === 0 && <View style={[styles.card, styles.empty, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Text style={[styles.small, styles.center, { color: theme.textSecondary }]}>
        AI chưa đọc được dòng hàng nào. Hãy chụp lại ảnh thấy rõ bảng hàng hoặc nhập thủ công.
      </Text>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  group: { gap: 16 }, flex: { flex: 1 }, shrink: { flexShrink: 1 }, center: { textAlign: 'center' },
  card: { gap: 16, padding: 16, borderWidth: 1, borderRadius: Radius.xl },
  panel: { paddingVertical: 24 },
  details: { gap: 12, paddingBottom: 4 },
  empty: { paddingVertical: 24 },
  hero: { alignItems: 'center', gap: 8 },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heading: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 18 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16 },
  value: { fontFamily: FontFamily.medium, fontSize: 15, lineHeight: 22, textAlign: 'right' },
  tips: { gap: 8, padding: 16, borderRadius: Radius.lg },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { gap: 8 },
  cardHead: { gap: 8 },
  fileChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.md },
  fieldRow: { flexDirection: 'row', gap: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  fieldStack: { gap: 8, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  fieldHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  fieldLabel: { width: 112, gap: 2 },
  fieldValue: { flex: 1, alignItems: 'flex-end', gap: 4 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, padding: 12, borderWidth: 1, borderRadius: Radius.lg },
  pressed: { opacity: 0.85 },
  section: { gap: 4, marginTop: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  note: { flexDirection: 'row', gap: 8 },
  noteIcon: { marginTop: 2 },
});
