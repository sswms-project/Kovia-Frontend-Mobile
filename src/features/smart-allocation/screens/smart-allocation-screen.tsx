import { useExitProtection } from '@/hooks/use-screen-exit';
import { useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { FontFamily, Radius } from '@/constants/theme';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { useSmartAllocation } from '../hooks/use-smart-allocation';
import type { AllocationOrder } from '../smart-allocation.schema';

export function SmartAllocationScreen() {
  const { identity, warehouseId, revision, signature } = useWarehouseAccess().selection;
  return <SmartAllocationWorkspace key={JSON.stringify([identity, warehouseId, revision, signature])} />;
}

function SmartAllocationWorkspace() {
  const state = useSmartAllocation();
  const list = useRef<FlatList<AllocationOrder>>(null);
  const theme = useTheme();
  const data = state.data;
  const demand = data?.demand;
  const active = !!demand && !demand.completedAt && !demand.revokedAt;
  const busy = state.mutation.isPending;
  useExitProtection(() => ({ busy, dirty: !!state.pickerId || state.acknowledged || state.hours !== 8,
    discard: async () => { state.setPickerId(''); state.setAcknowledged(false); state.setHours(8); state.cancel(); } }));
  const canAuthorize = !!data && data.order.status === 'Pending' && !!data.plan.documentVersion && data.plan.automationEnabled &&
    !active && !!state.pickerId && !state.context.isFetching && !state.context.isError;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.root, { backgroundColor: theme.background }]}>
    <FlatList ref={list} data={state.queueData?.items ?? []} keyExtractor={order => order.id}
      contentContainerStyle={styles.content} refreshing={state.queue.isFetching || state.context.isFetching}
      onRefresh={() => { void state.refresh(); }}
      renderItem={({ item }) => <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>{item.stockIssueRequestCode}</Text>
        <Button label={state.selected === item.id ? 'Đang xem đề xuất' : 'Xem đề xuất FEFO / đi thẳng'}
          variant="outline" disabled={busy} onPress={() => { state.select(item.id); list.current?.scrollToOffset({ offset: 0, animated: true }); }} />
      </View>}
      ListHeaderComponent={<View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Phân bổ kho thông minh</Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>{state.access.warehouse?.warehouseName}</Text>
        <AlertBanner title="FEFO trước, giảm thao tác sau" description="Hệ thống so hạn dùng trên toàn kho. Phần được chọn ở khu nhận có thể đi thẳng đến khu chờ xuất; nhân viên vẫn quét và xác nhận hàng thực tế." />
        {!state.ready && <AlertBanner title="Chọn kho và xác minh quyền xem phiếu xuất, giao người lấy hàng để sử dụng." />}
        {[state.queue.error, state.context.error, state.summary.error].filter(Boolean).map((error, index) =>
          <AlertBanner key={index} variant="destructive" title="Chưa tải được dữ liệu mới" description={getApiErrorMessage(error)} />)}
        {state.context.isPending && state.selected && <AlertBanner title="Đang đối chiếu lô và nhu cầu…" />}
        {data && <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{data.order.stockIssueRequestCode}</Text>
          {state.context.isError && <AlertBanner title="Dữ liệu cũ — chưa thể thực hiện thao tác." />}
          <AlertBanner title={data.plan.canAllocateWholeRequest ? 'Có phương án đủ toàn phiếu' : 'Chưa thể phân bổ mới'} description={data.plan.decision} />
          {!data.plan.automationEnabled && <AlertBanner title="Tự động phân bổ chưa được bật" description="Bạn có thể xem đề xuất. Cần quản trị hệ thống bật xử lý tự động trước khi cho phép phiếu tham gia." />}
          {data.plan.allocations.map(row => <View key={`${row.itemId}:${row.inventoryStockId}`} style={styles.section}>
            <Text style={[styles.title, { color: theme.text }]}>{row.sku} · {row.productName}</Text>
            <Text style={[styles.text, { color: theme.text }]}>{row.quantity} đơn vị cơ sở · Lô {row.lotNumber ?? 'Không áp dụng'} · {row.sourcePath}</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>{row.reason}</Text>
          </View>)}
          {demand && <AlertBanner title={demand.completedAt ? 'Đã tự phân bổ và giao việc' : demand.revokedAt ? 'Lần cho phép đã dừng' : 'Đã cho phép — đang chờ xử lý'}
            description={`${demand.decision} Hiệu lực đến ${new Date(demand.validUntil).toLocaleString('vi-VN')}.`} />}
          {active && <Button label="Thu hồi tự động phân bổ" variant="outline" disabled={busy || state.context.isError || state.context.isFetching} onPress={state.reviewRevoke} />}
          {data.order.status === 'Pending' && !active && <>
            <Text style={[styles.title, { color: theme.text }]}>Nhân viên thực hiện</Text>
            {data.pickers.map(picker => <Button key={picker.id} label={`${state.pickerId === picker.id ? 'Đã chọn: ' : ''}${picker.fullName}`}
              disabled={busy} variant="outline" onPress={() => state.setPickerId(picker.id)} />)}
            {!data.pickers.length && <AlertBanner title="Chưa có nhân viên đủ quyền và phân công tại kho." />}
            <Text style={[styles.text, { color: theme.textSecondary }]}>Thời hạn cho phép</Text>
            <View style={styles.section}>{[4, 8, 24].map(hours => <Button key={hours} label={`${state.hours === hours ? 'Đã chọn: ' : ''}${hours} giờ`}
              disabled={busy} variant="outline" onPress={() => state.setHours(hours)} />)}</View>
            <Button label={state.acknowledged ? 'Đã xác nhận tự duyệt nếu là người lập' : 'Xác nhận tự duyệt nếu là người lập'}
              variant="outline" disabled={busy} onPress={() => state.setAcknowledged(!state.acknowledged)} />
            <Text style={[styles.text, { color: theme.textSecondary }]}>Chủ doanh nghiệp có thể tự duyệt; quản lý cần quyền tự duyệt được cấp rõ ràng. Xác nhận này không tự cấp quyền.</Text>
            <Button label="Cho phép tự phân bổ khi đủ hàng" disabled={busy || !canAuthorize} onPress={state.reviewAuthorization} />
          </>}
        </View>}
        {state.notice && <AlertBanner title={state.notice} />}
        {state.summaryData && <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Kết quả 30 ngày gần nhất</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>Tính đến {new Date(state.summaryData.to).toLocaleString('vi-VN')}. Tải lại để cập nhật.</Text>
          {state.summary.isError && <AlertBanner title="Thống kê cũ — chưa tải được số mới." />}
          <Text style={[styles.text, { color: theme.textSecondary }]}>{state.summaryData.measurementBasis}</Text>
          {!state.summaryData.products.length && <Text style={[styles.text, { color: theme.textSecondary }]}>Chưa có phân bổ đi thẳng trong kỳ.</Text>}
          {state.summaryData.products.map(product => <View key={product.productId} style={styles.section}>
            <Text style={[styles.title, { color: theme.text }]}>{product.sku} · {product.baseUnitName}</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>Đã phân bổ đi thẳng: {product.allocatedDirectQuantity} · Thực lấy: {product.confirmedDirectPickedQuantity} · Thực xuất: {product.confirmedDirectDispatchedQuantity}</Text>
          </View>)}
        </View>}
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Phiếu xuất đang chờ</Text>
        {state.ready && state.queue.isSuccess && !state.queueData?.items.length && <AlertBanner title="Không có phiếu chờ trong trang này." />}
      </View>}
      ListFooterComponent={<View style={styles.section}>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Trang {state.page} · {state.queueData?.totalCount ?? 'Chưa tải'} phiếu</Text>
        <Button label="Trang trước" disabled={busy || state.page <= 1 || state.queue.isFetching} variant="outline" onPress={() => state.setPage(state.page - 1)} />
        <Button label="Trang sau" disabled={busy || state.queue.isFetching || state.page * 20 >= (state.queueData?.totalCount ?? 0)} variant="outline" onPress={() => state.setPage(state.page + 1)} />
        <Button label="Tải lại dữ liệu" variant="outline" disabled={busy} onPress={() => { void state.refresh(); }} />
      </View>} />
    <ConfirmationModal visible={state.ready && !!state.target} title={state.target?.action === 'Revoke' ? 'Thu hồi lần cho phép?' : 'Cho phép hệ thống tự phân bổ?'}
      description={state.target?.action === 'Revoke' ? 'Dừng lần cho phép đang chờ. Nếu hàng đã được phân bổ đồng thời, hệ thống sẽ yêu cầu xử lý bằng luồng hủy phiếu.'
        : `Có hiệu lực đến ${state.target?.action === 'Authorize' ? new Date(state.target.body.validUntil).toLocaleString('vi-VN') : ''}. Hệ thống có thể tự giữ hàng và giao việc khi đủ toàn phiếu theo FEFO. Chưa lấy hàng, chưa xuất thực tế và chưa giảm tổng tồn.`}
      busy={busy} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancel} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, paddingBottom: 48, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  section: { gap: 12 }, card: { padding: 16, gap: 12, borderWidth: 1, borderRadius: Radius.lg },
  heading: { fontFamily: FontFamily.bold, fontSize: 26, lineHeight: 34 }, title: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 25 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });
