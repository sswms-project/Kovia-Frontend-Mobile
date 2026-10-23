import { StyleSheet, Text, View } from 'react-native';

import { DetailHeading, DetailScroll, InfoRow, Section } from '@/components/ui/detail-sections';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/date-format';

import { useInboundRequestQuery } from '../hooks/use-inbound-requests';
import {
  INBOUND_STATUS_LABEL,
  INBOUND_STATUS_TONE,
  SOURCE_TYPE_LABEL,
} from '../inbound-requests.types';

interface InboundRequestDetailScreenProps {
  readonly requestId: string;
}

const formatQuantity = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 3 });

export function InboundRequestDetailScreen({ requestId }: InboundRequestDetailScreenProps) {
  const theme = useTheme();
  const query = useInboundRequestQuery(requestId);

  return (
    <QueryBoundary query={query} loadingMessage="Đang tải yêu cầu nhập kho…">
      {(request) => (
        <DetailScroll isRefreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
          <DetailHeading title={request.inboundRequestCode} />
          <StatusPill
            label={INBOUND_STATUS_LABEL[request.status] ?? request.status}
            tone={INBOUND_STATUS_TONE[request.status] ?? 'neutral'}
          />

          <Section title="Tổng quan">
            <InfoRow label="Loại nguồn" value={SOURCE_TYPE_LABEL[request.sourceType] ?? request.sourceType} />
            <InfoRow label="Nguồn hàng" value={request.supplierName ?? request.sourceName} />
            <InfoRow label="Mã tham chiếu" value={request.sourceReference} />
            <InfoRow label="Kho nhận" value={request.warehouseName} />
            <InfoRow label="Nhân viên nhận và cất hàng" value={request.receivingAssignedToName} />
            <InfoRow
              label="Ngày dự kiến"
              value={request.expectedDate ? formatDisplayDate(new Date(request.expectedDate)) : null}
            />
            <InfoRow label="Người tạo" value={request.createdByName} />
            <InfoRow label="Người duyệt" value={request.approvedByName} />
            <InfoRow label="Tạo lúc" value={formatDisplayDateTime(new Date(request.createdAt))} />
            {request.rejectionReason ? <InfoRow label="Yêu cầu chỉnh sửa" value={request.rejectionReason} /> : null}
            {request.cancellationReason ? <InfoRow label="Lý do hủy" value={request.cancellationReason} /> : null}
            {request.closureReason ? <InfoRow label="Lý do đóng" value={request.closureReason} /> : null}
          </Section>

          <Section title={`Dòng hàng (${request.lines.length})`}>
            {request.lines.map((line) => (
              <View key={line.id} style={styles.line}>
                <Text style={[styles.lineName, { color: theme.text }]}>{line.productName}</Text>
                <Text style={[styles.lineMeta, { color: theme.textSecondary }]}>{line.productSKU}</Text>
                <Text style={[styles.lineMeta, { color: theme.textSecondary }]}>
                  Đặt {formatQuantity(line.enteredQuantity)} {line.enteredUnitName ?? line.unitName ?? ''} · Đã nhận{' '}
                  {formatQuantity(line.receivedQuantity)} · Còn {formatQuantity(line.remainingQuantity)} (đơn vị cơ sở{' '}
                  {line.unitName ?? ''})
                </Text>
              </View>
            ))}
          </Section>

          <Section title={`Lịch sử xử lý (${request.history.length})`}>
            {request.history.map((event) => (
              <View key={`${event.createdAt}-${event.action}`} style={styles.line}>
                <Text style={[styles.lineName, { color: theme.text }]}>
                  {event.action}
                  {event.toState ? ` → ${INBOUND_STATUS_LABEL[event.toState] ?? event.toState}` : ''}
                </Text>
                <Text style={[styles.lineMeta, { color: theme.textSecondary }]}>
                  {event.actorName} · {formatDisplayDateTime(new Date(event.createdAt))}
                </Text>
                {event.reason ? <Text style={[styles.lineMeta, { color: theme.textSecondary }]}>{event.reason}</Text> : null}
              </View>
            ))}
          </Section>
        </DetailScroll>
      )}
    </QueryBoundary>
  );
}

const styles = StyleSheet.create({
  line: { gap: 2 },
  lineName: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  lineMeta: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
});
