import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { P } from '@/config/permission-codes';
import { FontFamily, MaxContentWidth } from '@/constants/theme';
import { useCan } from '@/features/auth/hooks/use-can';
import { ScannerScreen } from '@/features/scanner/screens/scanner-screen';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { ReceiveEntryCard, type ReceiveDraftPatch } from '../components/receive-entry-card';
import { useTransferReceiveSheetQuery, useTransferTaskMutations } from '../hooks/use-transfer-tasks';
import { transferTasksApi } from '../transfer-tasks.api';
import {
  buildReceiptBody,
  buildReceiveDrafts,
  matchesLineProduct,
  validateReceive,
  type ReceiveDraft,
} from '../transfer-tasks.logic';

type DraftEdit = ReceiveDraftPatch & Partial<Pick<ReceiveDraft, 'slot' | 'scannedSlotCode' | 'scannedProductCode'>>;

const RECEIVABLE_STATUSES: readonly string[] = ['InTransit', 'Receiving'];

interface TransferReceiveScreenProps {
  readonly transferId: string;
  readonly shipmentId: string;
}

export function TransferReceiveScreen({ transferId, shipmentId }: TransferReceiveScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const canView = useCan(P.TRANSFERS_VIEW);
  const canReceive = useCan(P.TRANSFERS_RECEIVE);
  const query = useTransferReceiveSheetQuery(transferId, shipmentId);
  const { submitReceipt } = useTransferTaskMutations(transferId, shipmentId);
  const [edits, setEdits] = useState<Record<string, DraftEdit>>({});
  const [scanKey, setScanKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sheet = query.data;
  // Drafts derive from the sheet; only the user's edits are state, so a refetch never loses them.
  const drafts = useMemo(
    () => (sheet ? buildReceiveDrafts(sheet).map((draft) => ({ ...draft, ...edits[draft.key] })) : []),
    [sheet, edits],
  );
  const isEditable = canReceive && !!sheet && RECEIVABLE_STATUSES.includes(sheet.shipmentStatus);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/tasks');
  }

  function patchDraft(key: string, patch: DraftEdit) {
    setEdits((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  }

  /** A product code is checked on the device; a shelf code is resolved by the BE in the destination warehouse. */
  async function handleScan(code: string): Promise<boolean> {
    const draft = drafts.find((entry) => entry.key === scanKey);
    if (!draft || !sheet) return false;
    if (matchesLineProduct(draft.line, code)) {
      patchDraft(draft.key, { scannedProductCode: code });
      return true;
    }
    try {
      const slot = await transferTasksApi.lookupReceivableSlot(sheet.destinationWarehouseId, code);
      if (!slot) return false;
      patchDraft(draft.key, { slot, scannedSlotCode: code });
      return true;
    } catch (failure) {
      toast.error(getApiErrorMessage(failure, 'Không tra được vị trí. Hãy quét nhãn đầy đủ.'));
      return false;
    }
  }

  function confirmReceive() {
    if (!sheet) return;
    const problem = validateReceive(drafts);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    Alert.alert('Xác nhận nhận hàng?', 'Mỗi đợt chỉ nhận một lần. Kiểm tra kỹ số lượng tốt, hỏng và thiếu.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: () => {
          submitReceipt
            .mutateAsync(buildReceiptBody(sheet, drafts))
            .then(() => {
              toast.success('Đã ghi nhận nhận hàng.');
              goBack();
            })
            .catch((failure: unknown) =>
              setError(getApiErrorMessage(failure, 'Không ghi nhận được nhận hàng. Hãy tải lại rồi thử lại.')),
            );
        },
      },
    ]);
  }

  if (!canView) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <AlertBanner title="Bạn chưa được cấp quyền xem phiếu điều chuyển." />
          <Button label="Quay lại" variant="outline" onPress={goBack} />
        </View>
      </SafeAreaView>
    );
  }
  if (query.isPending) return <LoadingState fullScreen message="Đang tải phiếu nhận hàng…" />;
  if (query.isError || !sheet) {
    return <ErrorState fullScreen error={query.error} onRetry={() => void query.refetch()} />;
  }

  const header = (
    <View style={styles.header}>
      <Button label="Về công việc của tôi" variant="ghost" onPress={goBack} />
      <Text accessibilityRole="header" style={[styles.code, { color: theme.text }]}>
        {sheet.transferCode}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        Đợt {sheet.shipmentNumber} · Nhận tại {sheet.destinationWarehouseName}
      </Text>
      {!isEditable ? (
        <AlertBanner title="Đợt hàng chưa ở trạng thái chờ nhận" description="Chỉ xem, không thể ghi nhận." />
      ) : null}
      {error ? <AlertBanner variant="destructive" title={error} /> : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList
        data={drafts}
        keyExtractor={(draft) => draft.key}
        renderItem={({ item }) => <ReceiveEntryCard draft={item} onChange={patchDraft} onScan={setScanKey} />}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListFooterComponent={
          isEditable ? (
            <View style={styles.footer}>
              <Button label="Xác nhận nhận hàng" loading={submitReceipt.isPending} onPress={confirmReceive} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
      />

      <Modal visible={scanKey !== null} animationType="slide" onRequestClose={() => setScanKey(null)}>
        <ScannerScreen title="Quét vị trí đặt hàng" onScan={handleScan} onClose={() => setScanKey(null)} />
      </Modal>
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, gap: 0 },
  header: { gap: 12, marginBottom: 16 },
  code: { fontFamily: FontFamily.mono, fontSize: 22, lineHeight: 30 },
  meta: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  separator: { height: 12 },
  footer: { marginTop: 20 },
});
