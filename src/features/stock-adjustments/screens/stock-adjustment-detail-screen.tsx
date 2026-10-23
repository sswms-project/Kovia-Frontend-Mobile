import { StyleSheet, Text, View } from 'react-native';

import { ApprovalActions } from '@/components/ui/approval-actions';
import { DetailHeading, DetailScroll, InfoRow, Section } from '@/components/ui/detail-sections';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDateTime } from '@/lib/date-format';

import { useStockAdjustmentDecision } from '../hooks/use-stock-adjustment-decision';
import { useStockAdjustmentQuery } from '../hooks/use-stock-adjustments';
import {
  ADJUSTMENT_QUALITY_LABEL,
  ADJUSTMENT_STATUS_LABEL,
  ADJUSTMENT_STATUS_TONE,
  type StockAdjustmentLine,
} from '../stock-adjustments.types';

interface StockAdjustmentDetailScreenProps {
  readonly adjustmentId: string;
}

const formatQuantity = (value?: number | null) =>
  value == null ? '—' : value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const formatChange = (value: number) => `${value > 0 ? '+' : ''}${formatQuantity(value)}`;
const lineLocation = (line: StockAdjustmentLine) =>
  line.isSystemDefaultSlot && line.rackCode ? `Kệ ${line.rackCode}` : line.slotCode || '—';

export function StockAdjustmentDetailScreen({ adjustmentId }: StockAdjustmentDetailScreenProps) {
  const theme = useTheme();
  const query = useStockAdjustmentQuery(adjustmentId);
  const decision = useStockAdjustmentDecision(adjustmentId);

  return (
    <QueryBoundary query={query} loadingMessage="Đang tải phiếu điều chỉnh…">
      {(voucher) => (
        <DetailScroll isRefreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
          <DetailHeading
            title={voucher.code}
            subtitle={`${voucher.warehouseName}${voucher.cycleCountCode ? ` · Từ phiếu kiểm kê ${voucher.cycleCountCode}` : ''}`}
          />
          <StatusPill
            label={ADJUSTMENT_STATUS_LABEL[voucher.status] ?? voucher.status}
            tone={ADJUSTMENT_STATUS_TONE[voucher.status] ?? 'neutral'}
          />
          <ApprovalActions
            subject="phiếu điều chỉnh tồn"
            canApprove={decision.canApprove}
            canReject={decision.canReject}
            approveDescription="Tồn kho sẽ được ghi nhận theo số kiểm đếm cho toàn bộ dòng chờ duyệt. Hành động này không thể hoàn tác."
            selfApprovalRequired={decision.selfApprovalRequired}
            busy={decision.busy}
            error={decision.error}
            onApprove={decision.approve}
            onReject={decision.reject}
            onDismiss={decision.dismiss}
          />
          <Section title="Tổng quan">
            <InfoRow label="Lý do" value={voucher.reason} />
            <InfoRow label="Số dòng" value={voucher.lineCount} />
            <InfoRow label="Tổng tăng" value={`+${formatQuantity(voucher.totalIncrease)}`} />
            <InfoRow label="Tổng giảm" value={formatQuantity(voucher.totalDecrease)} />
            <InfoRow label="Người tạo" value={voucher.createdByName} />
            <InfoRow label="Tạo lúc" value={formatDisplayDateTime(new Date(voucher.createdAt))} />
            {voucher.approvedAt ? (
              <InfoRow
                label="Duyệt"
                value={`${voucher.approvedByName ?? 'Người có thẩm quyền'} · ${formatDisplayDateTime(new Date(voucher.approvedAt))}`}
              />
            ) : null}
            {voucher.rejectedAt ? (
              <InfoRow
                label="Từ chối"
                value={`${voucher.rejectedByName ?? 'Người có thẩm quyền'} · ${formatDisplayDateTime(new Date(voucher.rejectedAt))}`}
              />
            ) : null}
            {voucher.rejectionReason ? <InfoRow label="Lý do từ chối" value={voucher.rejectionReason} /> : null}
          </Section>
          <Section title={`Dòng điều chỉnh (${voucher.lines.length})`}>
            {voucher.lines.map((line) => (
              <View key={line.id} style={styles.line}>
                <Text style={[styles.lineName, { color: theme.text }]}>{line.productName}</Text>
                <Text style={[styles.lineMeta, { color: theme.textSecondary }]}>
                  {line.productSku} · {lineLocation(line)} · {line.lotNumber ? `Lô ${line.lotNumber}` : 'Theo số lượng'}
                </Text>
                <Text style={[styles.lineMeta, { color: theme.textSecondary }]}>
                  Sổ sách {formatQuantity(line.systemQuantity)} · Kiểm đếm {formatQuantity(line.countedQuantity)} {line.unitName ?? ''}
                </Text>
                <Text style={[styles.lineMeta, { color: line.quantityChange < 0 ? theme.error : theme.textSecondary }]}>
                  Chênh lệch {formatChange(line.quantityChange)} · {ADJUSTMENT_QUALITY_LABEL[line.qualityStatus] ?? line.qualityStatus} ·{' '}
                  {ADJUSTMENT_STATUS_LABEL[line.status] ?? line.status}
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
