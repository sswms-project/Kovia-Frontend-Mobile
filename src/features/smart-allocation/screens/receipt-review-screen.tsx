import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { FontFamily, Radius } from '@/constants/theme';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { useReceiptReview } from '../hooks/use-receipt-review';

export function ReceiptReviewScreen() {
  const { identity, warehouseId, revision, signature } = useWarehouseAccess().selection;
  return <ReceiptReviewWorkspace key={JSON.stringify([identity, warehouseId, revision, signature])} />;
}
function ReceiptReviewWorkspace() {
  const state = useReceiptReview();
  const theme = useTheme();
  const receipt = state.data?.receipt;
  const busy = state.mutation.isPending;
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <FlatList data={state.queueData?.items ?? []} keyExtractor={item => item.id} contentContainerStyle={styles.content}
      refreshing={state.queue.isFetching || state.context.isFetching} onRefresh={() => { void state.refresh(); }}
      renderItem={({ item }) => <Button label={`Kiểm tra ${item.receiptCode}`} disabled={busy} variant="outline" onPress={() => state.select(item.id)} />}
      ListHeaderComponent={<View style={styles.section}>
        <Button label="Về tổng quan" variant="outline" onPress={() => router.navigate('/')} />
        <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Duyệt hàng tại khu nhận</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>{state.access.warehouse?.warehouseName}</Text>
        {!state.ready && <AlertBanner title="Cần chọn kho và có quyền xem, duyệt phiếu nhận." />}
        {[state.queue.error, state.context.error].filter(Boolean).map((error, index) => <AlertBanner key={index}
          variant="destructive" title="Chưa tải được dữ liệu mới" description={getApiErrorMessage(error)} />)}
        {receipt && <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>{receipt.receiptCode} · {receipt.status}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{receipt.supplierName ?? receipt.sourceName} · Người lập: {receipt.createdByName}</Text>
          {state.context.isError && <AlertBanner title="Dữ liệu cũ — chưa thể duyệt." />}
          {receipt.items.map(item => <View key={item.id} style={styles.section}>
            <Text style={[styles.title, { color: theme.text }]}>{item.productSKU} · {item.productName}</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>Chấp nhận {item.receivedQuantity} · Từ chối {item.rejectedQuantity} · Hỏng sau nhận {item.damagedQuantity} {item.baseUnitName}</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>Lô {item.lotNumber ?? 'Không áp dụng'} · Hạn {item.expiryDate ?? 'Không áp dụng'}</Text>
            {item.exceptionReason && <Text style={[styles.text, { color: theme.textSecondary }]}>{item.exceptionReason}</Text>}
          </View>)}
          {receipt.refusalEvidence.map(file => <Text key={file.id} style={[styles.text, { color: theme.textSecondary }]}>Bằng chứng từ chối: {file.fileName}</Text>)}
          {receipt.keptAtReceiving && <AlertBanner title="Hàng đạt đang được giữ tại vị trí nhận, chưa cất vào kệ." />}
          {state.canApprove && <>
            <AlertBanner title="Chọn cách tiếp tục sau kiểm hàng" description="Giữ tại khu nhận cho phép hệ thống chọn hàng theo FEFO để lấy trực tiếp. Chỉ chọn khi vị trí nhận thực tế phù hợp; phần chưa dùng có thể chuyển vị trí bằng công việc riêng." />
            <Button label={state.acknowledged ? 'Đã xác nhận tự duyệt nếu là người lập/nhận' : 'Xác nhận tự duyệt nếu là người lập/nhận'} variant="outline" disabled={busy}
              onPress={() => state.setAcknowledged(!state.acknowledged)} />
            <Button label="Duyệt và giữ hàng đạt tại khu nhận" disabled={busy || !state.canKeep} onPress={() => state.review(true)} />
            <Button label="Duyệt và tiếp tục cất / cách biệt" disabled={busy} variant="outline" onPress={() => state.review(false)} />
          </>}
        </View>}
        {state.notice && <AlertBanner title={state.notice} />}
        {state.ready && state.queue.isSuccess && !state.queueData?.items.length && <AlertBanner title="Không có phiếu nhận chờ duyệt trong trang này." />}
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Phiếu chờ duyệt</Text>
      </View>}
      ListFooterComponent={<View style={styles.section}>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Trang {state.page}</Text>
        <Button label="Trang trước" disabled={busy || state.page <= 1 || state.queue.isFetching} variant="outline" onPress={() => state.setPage(state.page - 1)} />
        <Button label="Trang sau" disabled={busy || state.queue.isFetching || state.page * 20 >= (state.queueData?.totalCount ?? 0)} variant="outline" onPress={() => state.setPage(state.page + 1)} />
      </View>} />
    <ConfirmationModal visible={state.ready && !!state.target} title="Xác nhận duyệt kết quả kiểm hàng?" busy={busy} error={state.mutation.error}
      description={state.target?.keepAtReceiving ? 'Hàng đạt trở thành khả dụng tại vị trí nhận, có thể được giữ cho phiếu xuất theo FEFO. Không ghi nhận đã cất vào kệ và không tăng tồn lần nữa.' : 'Duyệt phân loại hàng; phần cần cất/cách biệt tiếp tục theo công việc được giao. Không tăng tổng tồn lần nữa.'}
      onConfirm={() => { void state.confirm(); }} onCancel={state.cancel} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, paddingBottom: 48, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  section: { gap: 12 }, card: { padding: 16, gap: 12, borderWidth: 1, borderRadius: Radius.lg },
  heading: { fontFamily: FontFamily.bold, fontSize: 26, lineHeight: 34 }, title: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 25 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
