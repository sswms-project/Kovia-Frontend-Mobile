import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { WorkActionBar } from '@/components/work-action-bar';
import { useTransferPutawayAllocation } from '../hooks/use-transfer-putaway-allocation';
import { TransferPutawayWorkspace } from '../components/transfer-putaway-workspace';
import { WorkCompletionActions } from '@/components/work-completion-actions';
import { useScreenSubtitle } from '@/hooks/use-screen-exit';
import { router } from 'expo-router';
import { useCallback, useMemo, type ReactNode } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { ReceiptLotCard } from '../components/receipt-lot-card';
import { TransferReceiptEditor } from '../components/transfer-receipt-editor';
import { TransferPutAwayCard, TransferPutAwayHistoryCard } from '../components/transfer-putaway-card';
import { useTransferReceiving } from '../hooks/use-transfer-receiving';
import { transferReceivingDate, transferReceivingStatus } from '../transfer-receiving';
import type { TransferPutAwayEvent, TransferPutAwayRow, TransferReceiptLine, TransferReceivingMode } from '../transfer-receiving.schema';

type Row = { key: string; kind: 'Title'; text: string }
  | { key: string; kind: 'Receipt'; line: TransferReceiptLine; lot: TransferReceiptLine['lots'][number]; submitted: boolean }
  | { key: string; kind: 'PutAway'; row: TransferPutAwayRow }
  | { key: string; kind: 'History'; event: TransferPutAwayEvent; sku: string; unit: string };

export function TransferReceivingScreen({ transferId, shipmentId, mode }: {
  readonly transferId: string; readonly shipmentId: string; readonly mode: TransferReceivingMode;
}) {
  const state = useTransferReceiving(transferId, shipmentId, mode);
  const allocation = useTransferPutawayAllocation(state, transferId, shipmentId);
  const theme = useTheme();
  const data = state.data;
  useScreenSubtitle(data?.receipt.transferCode);
  const rows = useMemo(() => {
    const result: Row[] = [];
    if (!data) return result;
    if (mode === 'Receive') {
      result.push({ key: 'receipt-heading', kind: 'Title', text: 'Đối chiếu nhận hàng theo lô' });
      for (const line of data.receipt.lines) for (const lot of line.lots)
        result.push({ key: `receipt:${line.lineId}:${lot.lotId ?? 'none'}`, kind: 'Receipt', line, lot, submitted: !!data.receipt.receiptSubmittedAt });
    }
    if (mode === 'PutAway' && data.putAway) {
      result.push({ key: 'putaway-heading', kind: 'Title', text: 'Hàng tốt và vị trí dự kiến' });
      for (const row of data.putAway.rows)
        result.push({ key: `putaway:${row.lineId}:${row.lotId ?? 'none'}:${row.qualityStatus}`, kind: 'PutAway', row });
      result.push({ key: 'history-heading', kind: 'Title', text: 'Lịch sử cất hàng thực tế' });
      for (const event of data.putAway.putAwayLines) {
        const line = data.receipt.lines.find(value => value.lineId === event.lineId);
        result.push({ key: `history:${event.id}`, kind: 'History', event, sku: line?.sku ?? 'Dòng hàng lịch sử', unit: line?.baseUnitName ?? '' });
      }
    }
    return result;
  }, [data, mode]);
  const renderRow = useCallback(({ item }: { item: Row }) => {
    if (item.kind === 'Title') return <Text accessibilityRole="header" style={[styles.section, { color: theme.text }]}>{item.text}</Text>;
    if (item.kind === 'Receipt') return <ReceiptLotCard line={item.line} lot={item.lot} submitted={item.submitted} />;
    if (item.kind === 'PutAway') return <TransferPutAwayCard row={item.row} />;
    return <TransferPutAwayHistoryCard event={item.event} sku={item.sku} unit={item.unit} />;
  }, [theme.text]);
  const otherAssigned = data && (mode === 'Receive' ? data.shipment.putAwayTaskId && data.shipment.putAwayAssigneeId === state.access.profile.data?.id
    : data.shipment.receiveTaskId && data.shipment.receiveAssigneeId === state.access.profile.data?.id);
  const content = (controls: ReactNode) => <FlatList style={styles.root} data={rows} keyboardShouldPersistTaps="handled" renderItem={renderRow} keyExtractor={row => row.key} ItemSeparatorComponent={Separator}
      contentContainerStyle={styles.content} refreshing={state.detail.isFetching} onRefresh={() => { void state.refresh(); }}
      ListHeaderComponent={<View style={styles.header}>
        <WorkCompletionActions visible={!state.detail.isFetching && !state.detail.isError &&
          (mode === 'Receive' ? data?.shipment.receiveTaskStatus : data?.shipment.putAwayTaskStatus) === 'Completed'} message="Đã hoàn tất bước điều chuyển được giao." />
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{mode === 'Receive' ? 'Phiếu nhận điều chuyển' : 'Phiếu cất điều chuyển'}</Text>
        {!state.validId && <AlertBanner variant="destructive" title="Liên kết điều chuyển không hợp lệ." />}
        {!state.canView && <>
          <AlertBanner title="Chọn kho được giao và xác minh quyền xem điều chuyển để mở công việc." />
          <Button label="Kiểm tra lại kho và quyền" variant="outline" onPress={() => { void state.access.refresh(); }} />
        </>}
        {state.realtime.changed && <AlertBanner title="Phiếu hoặc kế hoạch có cập nhật" description="Giữ lại dữ liệu đang nhập; đóng biểu mẫu và tải lại trước khi gửi." />}
        {state.canView && state.detail.isPending && <AlertBanner title="Đang tải phiếu nhận và lịch sử…" />}
        {state.canView && state.detail.error && <AlertBanner variant="destructive" title="Chưa thể tải dữ liệu mới" description={getApiErrorMessage(state.detail.error)} />}
        {data && <>
          <Text style={[styles.section, { color: theme.text }]}>{data.receipt.transferCode} · Đợt {data.receipt.shipmentNumber}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{data.document.sourceWarehouseName} → {data.document.destinationWarehouseName}</Text>
          <AlertBanner title={transferReceivingStatus(data.receipt.status)} description="Thông tin đối chiếu phiếu nhận và kết quả đã ghi nhận. Xem chi tiết từng lô để phân biệt hàng tốt, hàng hỏng và thiếu." />
          {state.detail.isError && <AlertBanner title="Dữ liệu cũ" description={`Lần tải thành công: ${new Date(state.detail.dataUpdatedAt).toLocaleString('vi-VN')}. Thử tải lại trước khi sử dụng số liệu.`} />}
          <Text style={[styles.text, { color: theme.textSecondary }]}>Bắt đầu nhận: {transferReceivingDate(data.receipt.arrivedAt)}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>Gửi kết quả kiểm hàng: {transferReceivingDate(data.receipt.receiptSubmittedAt)}</Text>
          {controls}
          {!data.receipt.lines.length && <AlertBanner title="Chưa có dòng hàng đã xuất trong đợt này." />}
          {data.receipt.keptAtReceiving && <AlertBanner title="Đã chọn giữ hàng đạt tại khu nhận" description="Hàng đủ điều kiện được lấy theo FEFO từ vị trí thực tế hiện tại. Cất sau chỉ chuyển vị trí, không ghi nhập tồn thêm; hàng hỏng vẫn không khả dụng." />}
          {(data.document.isLegacyWorkflow || (![1, 2].includes(data.receipt.receiptFlowVersion) && data.receipt.status !== 'InTransit')) && <AlertBanner
            title="Phiếu thuộc luồng nhận hàng cũ" description="Đang hiển thị thông tin đối chiếu. Không suy ra số lượng chờ cất từ phiếu cũ." />}
          {mode === 'PutAway' && data.putAway && !data.putAway.rows.length && <AlertBanner title="Không có dòng hàng tốt trong phiếu cất hiện tại." />}
          {mode === 'PutAway' && data.putAway && !data.putAway.putAwayLines.length && <AlertBanner title="Chưa có lịch sử cất thực tế." />}
          {otherAssigned && <Button label={mode === 'Receive' ? 'Xem phiếu cất được giao' : 'Xem phiếu nhận được giao'} variant="outline"
            onPress={() => router.push({ pathname: mode === 'Receive' ? '/(account)/transfer-putaway/[id]' : '/(account)/transfer-receipt/[id]',
              params: { id: transferId, shipmentId } })} />}
        </>}
        <Button label="Tải lại dữ liệu" variant="outline" loading={state.detail.isFetching} onPress={() => { void state.refresh(); }} />
      </View>} />;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.root, { backgroundColor: theme.background }]}>
    {mode === 'PutAway' ? <>
      {content(allocation.execution.notice ? <AlertBanner title={allocation.execution.notice} /> : null)}
      {allocation.execution.allowed('PutAway') && <WorkActionBar hint="Chia theo vị trí thực cất, xác nhận mã từng phân bổ. Tổng tồn kho không tăng thêm.">
        <Button label="Phân bổ và cất hàng điều chuyển" disabled={allocation.execution.mutation.isPending} onPress={allocation.open} />
      </WorkActionBar>}
      {allocation.execution.allowed('Resume') && <WorkActionBar hint="Chỉ tiếp tục cất phần còn đủ điều kiện, không chạm hàng đã giữ cho phiếu khác.">
        <Button label="Tiếp tục cất phần hàng còn ở khu nhận" onPress={() => allocation.execution.prepare({ action: 'Resume', body: {
          expectedVersion: data!.receipt.version!, commandId: '' } })} />
      </WorkActionBar>}
      <TransferPutawayWorkspace state={allocation} warehouseId={data?.document.destinationWarehouseId ?? ''} code={data?.receipt.transferCode ?? ''} />
      <ConfirmationModal visible={allocation.execution.target?.action === 'Resume'} title="Tiếp tục cất hàng?"
        description="Chỉ cất phần hàng còn đủ điều kiện. Thao tác không tăng tồn thêm."
        busy={allocation.execution.mutation.isPending} error={allocation.execution.mutation.error}
        onConfirm={() => { void allocation.execution.confirm(); }} onCancel={allocation.execution.cancel} />
    </> : <TransferReceiptEditor key={JSON.stringify([state.access.selection.identity, state.access.selection.warehouseId, state.access.selection.revision, state.access.selection.signature, transferId, shipmentId, mode])}
      state={state} transferId={transferId} shipmentId={shipmentId} mode={mode}>{content}</TransferReceiptEditor>}
  </SafeAreaView>;
}
function Separator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 48 },
  header: { gap: 16, paddingBottom: 16 }, separator: { height: 14 }, title: { fontFamily: FontFamily.bold, fontSize: 26, lineHeight: 34 },
  section: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 26 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
