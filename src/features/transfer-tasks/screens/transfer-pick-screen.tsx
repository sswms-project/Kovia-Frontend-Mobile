import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
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

import { PickLineCard } from '../components/pick-line-card';
import { useTransferPickSheetQuery, useTransferTaskMutations } from '../hooks/use-transfer-tasks';
import {
  canCompletePicking,
  canPickSheet,
  findSuggestion,
  matchesLineProduct,
  parseQuantity,
} from '../transfer-tasks.logic';
import type { PickSheetLine, RecordPickBody } from '../transfer-tasks.types';

interface ScanState {
  readonly slot?: string;
  readonly product?: string;
}

interface TransferPickScreenProps {
  readonly transferId: string;
  readonly shipmentId: string;
}

const defaultQuantity = (line: PickSheetLine, stockId: string | null) => {
  const suggestion = line.suggestions.find((entry) => entry.inventoryStockId === stockId);
  return String(Math.min(suggestion?.suggestedQuantity ?? line.remainingQuantity, line.remainingQuantity));
};

export function TransferPickScreen({ transferId, shipmentId }: TransferPickScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const canView = useCan(P.TRANSFERS_VIEW);
  const canPick = useCan(P.TRANSFERS_PICK);
  const query = useTransferPickSheetQuery(transferId, shipmentId);
  const { recordPick, completePicking } = useTransferTaskMutations(transferId, shipmentId);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [scans, setScans] = useState<Record<string, ScanState>>({});
  const [scanLineId, setScanLineId] = useState<string | null>(null);
  const [submittingLineId, setSubmittingLineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A retry of the same pick reuses its command id; a changed pick gets a new one.
  const attemptsRef = useRef<Record<string, { key: string; commandId: string }>>({});

  const sheet = query.data;
  const isEditable = canPick && !!sheet && canPickSheet(sheet);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/tasks');
  }

  const selectedFor = (line: PickSheetLine) => selection[line.lineId] ?? line.suggestions[0]?.inventoryStockId ?? null;
  const quantityFor = (line: PickSheetLine) =>
    quantities[line.lineId] ?? defaultQuantity(line, selectedFor(line));

  function selectSuggestion(lineId: string, stockId: string) {
    const line = sheet?.lines.find((entry) => entry.lineId === lineId);
    setSelection((current) => ({ ...current, [lineId]: stockId }));
    if (line) setQuantities((current) => ({ ...current, [lineId]: defaultQuantity(line, stockId) }));
  }

  /** A shelf code selects that suggestion; a product code confirms the item. Anything else is rejected. */
  function handleScan(code: string): boolean {
    const line = sheet?.lines.find((entry) => entry.lineId === scanLineId);
    if (!line) return false;

    const suggestion = findSuggestion(line, code);
    if (suggestion) {
      selectSuggestion(line.lineId, suggestion.inventoryStockId);
      setScans((current) => ({ ...current, [line.lineId]: { ...current[line.lineId], slot: code } }));
      return true;
    }
    if (matchesLineProduct(line, code)) {
      setScans((current) => ({ ...current, [line.lineId]: { ...current[line.lineId], product: code } }));
      return true;
    }
    return false;
  }

  async function submitLine(lineId: string) {
    const line = sheet?.lines.find((entry) => entry.lineId === lineId);
    if (!line || submittingLineId) return;
    const stockId = selectedFor(line);
    const scannedSlotCode = scans[lineId]?.slot;
    const quantity = parseQuantity(quantityFor(line));
    if (!stockId) return setError('Chọn vị trí lấy hàng.');
    if (!scannedSlotCode) return setError('Quét mã vị trí trước khi ghi nhận.');
    if (quantity === null || quantity <= 0) return setError('Nhập số lượng lớn hơn 0 (tối đa 2 chữ số thập phân).');
    if (quantity > line.remainingQuantity + 1e-6) return setError('Số lượng vượt quá phần còn phải lấy.');

    const fields = {
      lineId,
      inventoryStockId: stockId,
      quantity,
      scannedSlotCode,
      ...(scans[lineId]?.product ? { scannedProductCode: scans[lineId]?.product } : {}),
    };
    const key = JSON.stringify(fields);
    const previous = attemptsRef.current[lineId];
    const commandId = previous?.key === key ? previous.commandId : Crypto.randomUUID();
    attemptsRef.current[lineId] = { key, commandId };
    const body: RecordPickBody = { ...fields, commandId };

    setError(null);
    setSubmittingLineId(lineId);
    try {
      await recordPick.mutateAsync(body);
      toast.success('Đã ghi nhận lấy hàng.');
      setScans((current) => ({ ...current, [lineId]: {} }));
      setQuantities((current) => {
        const { [lineId]: _removed, ...rest } = current;
        return rest;
      });
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Không ghi nhận được lấy hàng. Vui lòng thử lại.'));
    } finally {
      setSubmittingLineId(null);
    }
  }

  function confirmComplete() {
    if (!sheet) return;
    Alert.alert('Hoàn tất lấy hàng?', 'Đợt hàng sẽ chuyển sang chờ quản lý cho xuất.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Hoàn tất',
        onPress: () => {
          completePicking
            .mutateAsync(sheet.version)
            .then(() => {
              toast.success('Đã hoàn tất lấy hàng.');
              goBack();
            })
            .catch((failure: unknown) => setError(getApiErrorMessage(failure, 'Không hoàn tất được lấy hàng.')));
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
  if (query.isPending) return <LoadingState fullScreen message="Đang tải phiếu lấy hàng…" />;
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
        Đợt {sheet.shipmentNumber} · {sheet.sourceWarehouseName} → {sheet.destinationWarehouseName}
      </Text>
      {!canPickSheet(sheet) ? (
        <AlertBanner title="Đợt hàng không ở trạng thái lấy hàng" description="Chỉ xem, không thể ghi nhận thêm." />
      ) : null}
      {error ? <AlertBanner variant="destructive" title={error} /> : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList
        data={sheet.lines}
        keyExtractor={(line) => line.lineId}
        renderItem={({ item: line }) => (
          <PickLineCard
            line={line}
            isEditable={isEditable}
            isSubmitting={submittingLineId === line.lineId}
            selectedStockId={selectedFor(line)}
            quantity={quantityFor(line)}
            scannedSlot={scans[line.lineId]?.slot ?? null}
            scannedProduct={scans[line.lineId]?.product ?? null}
            onSelectSuggestion={selectSuggestion}
            onQuantityChange={(lineId, value) => setQuantities((current) => ({ ...current, [lineId]: value }))}
            onScan={setScanLineId}
            onSubmit={(lineId) => void submitLine(lineId)}
          />
        )}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListFooterComponent={
          isEditable ? (
            <View style={styles.footer}>
              <Button
                label="Hoàn tất lấy hàng"
                loading={completePicking.isPending}
                disabled={!canCompletePicking(sheet)}
                onPress={confirmComplete}
              />
            </View>
          ) : null
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        extraData={[selection, quantities, scans, submittingLineId]}
      />

      <Modal visible={scanLineId !== null} animationType="slide" onRequestClose={() => setScanLineId(null)}>
        <ScannerScreen
          title="Quét vị trí, rồi quét sản phẩm"
          onScan={handleScan}
          onClose={() => setScanLineId(null)}
        />
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
