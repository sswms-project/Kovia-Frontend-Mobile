import { useRouter } from 'expo-router';
import { ScanLine, TriangleAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { P } from '@/config/permission-codes';
import { FontFamily, MaxContentWidth } from '@/constants/theme';
import { useCan } from '@/features/auth/hooks/use-can';
import { useMe } from '@/features/auth/hooks/use-me';
import { ScannerScreen } from '@/features/scanner/screens/scanner-screen';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { PickRowCard } from '../components/pick-row-card';
import {
  usePickStockIssueMutation,
  useReportPickIssueMutation,
  useStockIssueRequestQuery,
} from '../hooks/use-stock-issue-requests';
import {
  buildPickBody,
  buildPickRows,
  canPick,
  findItemsByCode,
  itemRemaining,
  normalizeCode,
  parseEntered,
  rowLimit,
  validateEntries,
} from '../picking';
import { STOCK_ISSUE_STATUS_LABEL, STOCK_ISSUE_STATUS_TONE } from '../stock-issue-requests.types';

interface PickingScreenProps {
  readonly id: string;
}

export function PickingScreen({ id }: PickingScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const me = useMe();
  const canViewRequests = useCan(P.STOCK_ISSUE_REQUESTS_VIEW);
  const canPickPermission = useCan(P.STOCK_ISSUE_REQUESTS_PICK);
  const query = useStockIssueRequestQuery(id);
  const pickMutation = usePickStockIssueMutation(id);
  const reportMutation = useReportPickIssueMutation(id);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [scannedBarcodes, setScannedBarcodes] = useState<Record<string, string>>({});
  const [currentSlot, setCurrentSlot] = useState<string | null>(null);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const request = query.data;
  const rows = useMemo(() => (request ? buildPickRows(request) : []), [request]);
  const isPickable = !!request && canPickPermission && canPick(request, me.data?.id);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/tasks');
  }

  function changeEntry(key: string, value: string) {
    setEntries((current) => ({ ...current, [key]: value }));
  }

  /** A shelf code selects the current shelf; a product code fills the matching row on that shelf. */
  function handleScan(code: string): boolean {
    if (!request) return false;
    const normalized = normalizeCode(code);
    const shelf = rows.find((row) => normalizeCode(row.location.slotCode) === normalized);
    if (shelf) {
      setCurrentSlot(shelf.location.slotCode);
      return true;
    }

    const item = findItemsByCode(request, code)[0];
    if (!item) return false;
    const itemRows = rows.filter((row) => row.item.id === item.id);
    const target = currentSlot
      ? itemRows.find((row) => normalizeCode(row.location.slotCode) === normalizeCode(currentSlot))
      : (itemRows.find((row) => !entries[row.key]) ?? itemRows[0]);
    // With a shelf selected, a product that is not reserved there is rejected rather than guessed.
    if (!target) return false;

    setScannedBarcodes((current) => ({ ...current, [item.id]: item.barcode ?? code }));
    const limit = rowLimit(target, rows, entries);
    const alreadyEntered = parseEntered(entries[target.key]) ?? 0;
    const next = Math.min(limit, alreadyEntered + 1);
    setEntries((current) => ({ ...current, [target.key]: String(next) }));
    return true;
  }

  async function handleConfirm() {
    if (!request || pickMutation.isPending) return;
    const problem = validateEntries(rows, entries, scannedBarcodes);
    if (problem) {
      setSubmitError(problem);
      return;
    }
    setSubmitError(null);
    try {
      await pickMutation.mutateAsync(buildPickBody(rows, entries, scannedBarcodes, currentSlot));
      toast.success('Đã ghi nhận lấy hàng.');
      setEntries({});
      setScannedBarcodes({});
      setCurrentSlot(null);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Không ghi nhận được lấy hàng. Vui lòng tải lại rồi thử lại.'));
    }
  }

  async function handleReport() {
    const reason = reportReason.trim();
    if (!reason || reportMutation.isPending) return;
    try {
      await reportMutation.mutateAsync({ reason });
      toast.success('Đã báo sự cố cho người phụ trách.');
      setIsReportOpen(false);
      setReportReason('');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không gửi được báo cáo sự cố.'));
    }
  }

  if (!canViewRequests) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <AlertBanner title="Bạn chưa được cấp quyền xem yêu cầu xuất kho." />
          <Button label="Quay lại" variant="outline" onPress={goBack} />
        </View>
      </SafeAreaView>
    );
  }
  if (query.isPending) return <LoadingState fullScreen message="Đang tải phiếu lấy hàng…" />;
  if (query.isError || !request) {
    return <ErrorState fullScreen error={query.error} onRetry={() => void query.refetch()} />;
  }

  const pickedLines = request.items.filter((item) => itemRemaining(item) <= 0).length;
  const header = (
    <View style={styles.header}>
      <Button label="Về công việc của tôi" variant="ghost" onPress={goBack} />
      <Text accessibilityRole="header" style={[styles.code, { color: theme.text }]}>
        {request.stockIssueRequestCode}
      </Text>
      <View style={styles.row}>
        <StatusPill
          label={STOCK_ISSUE_STATUS_LABEL[request.status] ?? request.status}
          tone={STOCK_ISSUE_STATUS_TONE[request.status] ?? 'neutral'}
        />
      </View>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {request.warehouseName} · {request.recipientName} · Đã lấy đủ {pickedLines}/{request.items.length} dòng
      </Text>

      {!isPickable ? (
        <AlertBanner
          title="Không thể lấy hàng ở phiếu này"
          description="Phiếu chưa được giao việc, đã lấy xong, hoặc được giao cho người khác."
        />
      ) : (
        <>
          {currentSlot ? <AlertBanner title={`Đang ở kệ ${currentSlot}`} description="Quét sản phẩm để điền số lượng tại kệ này." /> : null}
          <Button
            label="Quét kệ hoặc sản phẩm"
            variant="outline"
            renderIcon={(color) => <ScanLine size={18} color={color} />}
            onPress={() => setIsScanOpen(true)}
          />
        </>
      )}
    </View>
  );

  const footer = isPickable ? (
    <View style={styles.footer}>
      {submitError ? <AlertBanner variant="destructive" title={submitError} /> : null}
      <Button label="Xác nhận đã lấy" loading={pickMutation.isPending} onPress={() => void handleConfirm()} />
      <Button
        label="Báo sự cố lấy hàng"
        variant="outline"
        renderIcon={(color) => <TriangleAlert size={18} color={color} />}
        onPress={() => setIsReportOpen(true)}
      />
    </View>
  ) : null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={({ item: row }) => (
          <PickRowCard
            row={row}
            value={entries[row.key] ?? ''}
            limit={rowLimit(row, rows, entries) }
            isScanned={!!scannedBarcodes[row.item.id]}
            isCurrentSlot={!!currentSlot && normalizeCode(currentSlot) === normalizeCode(row.location.slotCode)}
            disabled={!isPickable}
            onChange={changeEntry}
          />
        )}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        extraData={entries}
      />

      <Modal visible={isScanOpen} animationType="slide" onRequestClose={() => setIsScanOpen(false)}>
        <ScannerScreen title="Quét kệ hoặc sản phẩm" onScan={handleScan} onClose={() => setIsScanOpen(false)} />
      </Modal>

      <Modal visible={isReportOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsReportOpen(false)}>
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
          <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.content}>
              <Text accessibilityRole="header" style={[styles.code, { color: theme.text }]}>
                Báo sự cố lấy hàng
              </Text>
              <TextField
                label="Mô tả sự cố"
                multiline
                maxLength={500}
                value={reportReason}
                onChangeText={setReportReason}
                hint="Ví dụ: thiếu hàng tại kệ, hàng hỏng, kệ bị chặn."
              />
              <Button
                label="Gửi báo cáo"
                loading={reportMutation.isPending}
                disabled={reportReason.trim() === ''}
                onPress={() => void handleReport()}
              />
              <Button label="Đóng" variant="outline" onPress={() => setIsReportOpen(false)} />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, gap: 16 },
  header: { gap: 12, marginBottom: 16 },
  code: { fontFamily: FontFamily.mono, fontSize: 22, lineHeight: 30 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  meta: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  separator: { height: 12 },
  footer: { gap: 12, marginTop: 20 },
});
