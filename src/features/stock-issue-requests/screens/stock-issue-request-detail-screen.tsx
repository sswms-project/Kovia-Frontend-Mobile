import { StyleSheet, Text, View } from 'react-native';

import { DetailHeading, DetailScroll, InfoRow, Section } from '@/components/ui/detail-sections';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/date-format';

import { useStockIssueRequestQuery } from '../hooks/use-stock-issue-requests';
import { STOCK_ISSUE_STATUS_LABEL, STOCK_ISSUE_STATUS_TONE } from '../stock-issue-requests.types';

interface StockIssueRequestDetailScreenProps {
  readonly requestId: string;
}

const formatQuantity = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 3 });

export function StockIssueRequestDetailScreen({ requestId }: StockIssueRequestDetailScreenProps) {
  const theme = useTheme();
  const query = useStockIssueRequestQuery(requestId);

  return (
    <QueryBoundary query={query} loadingMessage="Đang tải yêu cầu xuất kho…">
      {(request) => (
        <DetailScroll isRefreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
          <DetailHeading title={request.stockIssueRequestCode} subtitle={request.recipientName} />
          <StatusPill
            label={STOCK_ISSUE_STATUS_LABEL[request.status] ?? request.status}
            tone={STOCK_ISSUE_STATUS_TONE[request.status] ?? 'neutral'}
          />

          <Section title="Tổng quan">
            <InfoRow label="Kho xuất" value={request.warehouseName} />
            <InfoRow label="Đơn vị nhận hàng" value={`${request.recipientCode ?? ''} ${request.stockRecipientName}`.trim()} />
            <InfoRow label="Người nhận" value={request.recipientName} />
            <InfoRow label="Điện thoại" value={request.recipientPhone} />
            <InfoRow label="Địa chỉ nhận" value={request.recipientAddress} />
            <InfoRow
              label="Ngày xuất"
              value={request.issueDate ? formatDisplayDate(new Date(request.issueDate)) : null}
            />
            <InfoRow label="Mã tham chiếu" value={request.referenceCode} />
            <InfoRow label="Người lấy hàng" value={request.assignedStaffName ?? 'Chưa phân công'} />
            <InfoRow
              label="Rời kho lúc"
              value={request.dispatchedAt ? formatDisplayDateTime(new Date(request.dispatchedAt)) : null}
            />
            <InfoRow label="Mục đích" value={request.purpose} />
            <InfoRow label="Ghi chú" value={request.note} />
          </Section>

          <Section title={`Dòng hàng (${request.items.length})`}>
            {request.items.map((item) => {
              const factor = item.conversionFactor || 1;
              const unit = item.enteredUnitName ?? '';
              return (
                <View key={item.id} style={styles.line}>
                  <Text style={[styles.lineName, { color: theme.text }]}>{item.productName}</Text>
                  <Text style={[styles.lineMeta, { color: theme.textSecondary }]}>{item.sku}</Text>
                  <Text style={[styles.lineMeta, { color: theme.textSecondary }]}>
                    Yêu cầu {formatQuantity(item.enteredQuantity)} {unit} · Đã lấy{' '}
                    {formatQuantity(item.pickedQuantity / factor)} · Còn{' '}
                    {formatQuantity(Math.max(0, item.quantity - item.pickedQuantity) / factor)}
                  </Text>
                  {item.pickLocations.map((location) => (
                    <Text key={location.inventoryStockId} style={[styles.lineMeta, { color: theme.primary }]}>
                      {location.slotCode}
                      {location.lotNumber ? ` · Lô ${location.lotNumber}` : ''} ·{' '}
                      {formatQuantity(location.reservedQuantity / factor)} {unit}
                    </Text>
                  ))}
                </View>
              );
            })}
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
