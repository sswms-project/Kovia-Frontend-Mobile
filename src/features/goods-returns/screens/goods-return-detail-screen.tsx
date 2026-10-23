import { StyleSheet, Text, View } from 'react-native';

import { DetailHeading, DetailScroll, InfoRow, Section } from '@/components/ui/detail-sections';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { WarehouseWorkspaceControl } from '@/components/warehouse-workspace';
import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDateTime } from '@/lib/date-format';

import { useReturnReceiving } from '../hooks/use-return-receiving';
import { RETURN_CONDITION_LABEL, RETURN_STATUS_LABEL, RETURN_STATUS_TONE } from '../goods-returns.types';

interface GoodsReturnDetailScreenProps {
  readonly returnId: string;
}

export function GoodsReturnDetailScreen({ returnId }: GoodsReturnDetailScreenProps) {
  const theme = useTheme();
  const state = useReturnReceiving(returnId);
  const query = state.query;

  return (
    <><QueryBoundary query={query} loadingMessage="Đang tải yêu cầu trả hàng…">
      {(request) => (
        <DetailScroll isRefreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
          <DetailHeading
            title={request.goodsReturnRequestCode}
            subtitle={`Yêu cầu xuất kho ${request.stockIssueRequestCode}`}
          />
          <StatusPill
            label={RETURN_STATUS_LABEL[request.status] ?? request.status}
            tone={RETURN_STATUS_TONE[request.status] ?? 'neutral'}
          />
          <WarehouseWorkspaceControl access={state.access} />
          <AlertBanner title="Nhận theo toàn bộ phiếu đã duyệt" description="Đối chiếu hàng thực tế với từng dòng, phân loại và vị trí trên phiếu trước khi xác nhận. Nếu khác số lượng hoặc tình trạng, dừng nhận và yêu cầu quản lý xử lý trên web. Luồng hiện tại chưa nhận từng phần." />
          {state.original.data && <InfoRow label="Kho nhận" value={state.original.data.warehouseName} />}
          {state.original.error && <AlertBanner title="Chưa xác minh được kho nhận" description={state.original.error.message} />}
          {state.locations.error && <AlertBanner title="Chưa xác minh được vị trí nhận" description={state.locations.error.message} />}
          {state.attempt.error && <AlertBanner title="Chưa xác minh được lần nhận trước. Vui lòng tải lại." />}
          {state.uncertain && <AlertBanner title="Cần kiểm tra kết quả lần nhận trước" description="Không gửi lại trong khi chưa rõ kết quả. Tải lại phiếu và kiểm tra tồn/lịch sử trên web hoặc liên hệ quản lý." />}
          {state.mutation.isSuccess && <AlertBanner title="Đã ghi nhận nhập lại kho theo phiếu." />}
          {state.canReceive && <Button label="Xác nhận đã nhận đủ hàng theo phiếu" loading={state.mutation.isPending} onPress={state.begin} />}
          <Section title="Thông tin">
            <InfoRow label="Lý do trả hàng" value={request.reason} />
            {request.rejectionReason ? <InfoRow label="Lý do từ chối" value={request.rejectionReason} /> : null}
            <InfoRow label="Tạo lúc" value={formatDisplayDateTime(new Date(request.createdAt))} />
            <InfoRow
              label="Duyệt lúc"
              value={request.approvedAt ? formatDisplayDateTime(new Date(request.approvedAt)) : null}
            />
          </Section>
          <Section title={`Dòng hàng (${request.items.length})`}>
            {request.items.map((item) => (
              <View key={item.id} style={styles.line}>
                <Text style={[styles.lineName, { color: theme.text }]}>{item.productName}</Text>
                <Text style={[styles.lineMeta, { color: theme.textSecondary }]}>
                  {item.sku} · {item.lotNumber ? `Lô ${item.lotNumber}` : 'Theo số lượng'}
                </Text>
                <Text style={[styles.lineMeta, { color: theme.textSecondary }]}>
                  {item.quantity.toLocaleString('vi-VN')} · {RETURN_CONDITION_LABEL[item.condition] ?? item.condition}
                </Text>
                <Text selectable style={[styles.lineMeta, { color: theme.textSecondary }]}>{item.condition === 'Scrap' ? 'Không cộng vào tồn kho; không phải xác nhận tiêu hủy.' : `Vị trí đã duyệt: ${state.locations.data?.find(location => location.id === item.restockSlotId)?.path ?? 'Chưa xác minh; xem vị trí trên web trước khi nhận.'}`}</Text>
              </View>
            ))}
          </Section>
        </DetailScroll>
      )}
    </QueryBoundary><ConfirmationModal visible={!!state.confirmation} title="Đã kiểm đủ hàng thực tế và đặt đúng vị trí?"
      description="Xác nhận toàn bộ lượng trên phiếu vào các vị trí đã duyệt. Hàng tốt được khả dụng theo BE hiện tại; hàng hỏng/hết hạn bị giữ và cần cách biệt thực tế. Dòng không nhập lại không cộng tồn. Không xác nhận nếu hàng chưa tới hoặc có chênh lệch."
      busy={state.mutation.isPending} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancel} /></>
  );
}

const styles = StyleSheet.create({
  line: { gap: 2 },
  lineName: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  lineMeta: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
});
