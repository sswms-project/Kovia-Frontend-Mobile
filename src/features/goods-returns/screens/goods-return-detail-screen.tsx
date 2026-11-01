import { StyleSheet, Text, View } from 'react-native';

import { ApprovalActions } from '@/components/ui/approval-actions';
import { DetailHeading, DetailScroll, InfoRow, Section } from '@/components/ui/detail-sections';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { WarehouseWorkspaceControl } from '@/components/warehouse-workspace';
import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDateTime } from '@/lib/date-format';

import { useReturnDecision } from '../hooks/use-return-decision';
import { useGoodsReturnQuery } from '../hooks/use-goods-returns';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { AssignedReturnAction } from '@/features/return-work/components/assigned-return-action';
import { RETURN_CONDITION_LABEL, RETURN_STATUS_LABEL, RETURN_STATUS_TONE } from '../goods-returns.types';

interface GoodsReturnDetailScreenProps {
  readonly returnId: string;
}

export function GoodsReturnDetailScreen({ returnId }: GoodsReturnDetailScreenProps) {
  const theme = useTheme();
  const access = useWarehouseAccess();
  const query = useGoodsReturnQuery(returnId);
  const decision = useReturnDecision(query.data);

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
          <WarehouseWorkspaceControl access={access} />
          <ApprovalActions
            subject="yêu cầu trả hàng"
            canApprove={decision.canDecide}
            canReject={decision.canDecide}
            approveDescription="Phiếu chuyển sang Đã duyệt để kho nhận lại hàng. Kiểm tra lý do, dòng hàng và tình trạng trước khi xác nhận."
            busy={decision.busy}
            error={decision.error}
            onApprove={decision.approve}
            onReject={decision.reject}
            onDismiss={decision.dismiss}
          />
          {request.status === 'Approved' && <AssignedReturnAction documentId={returnId} />}
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
                <Text selectable style={[styles.lineMeta, { color: theme.textSecondary }]}>{item.condition === 'Scrap' ? 'Không cộng vào tồn kho; không phải xác nhận tiêu hủy.' : 'Kiểm tra tình trạng và vị trí cất trong công việc nhận hàng được giao.'}</Text>
              </View>
            ))}
          </Section>
        </DetailScroll>
      )}
    </QueryBoundary></>
  );
}

const styles = StyleSheet.create({
  line: { gap: 2 },
  lineName: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  lineMeta: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
});
