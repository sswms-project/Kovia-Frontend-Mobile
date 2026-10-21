import { StyleSheet, Text, View } from 'react-native';

import { DetailHeading, DetailScroll, InfoRow, Section } from '@/components/ui/detail-sections';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDateTime } from '@/lib/date-format';

import { useGoodsReturnQuery } from '../hooks/use-goods-returns';
import { RETURN_CONDITION_LABEL, RETURN_STATUS_LABEL, RETURN_STATUS_TONE } from '../goods-returns.types';

interface GoodsReturnDetailScreenProps {
  readonly returnId: string;
}

export function GoodsReturnDetailScreen({ returnId }: GoodsReturnDetailScreenProps) {
  const theme = useTheme();
  const query = useGoodsReturnQuery(returnId);

  return (
    <QueryBoundary query={query} loadingMessage="Đang tải yêu cầu trả hàng…">
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
