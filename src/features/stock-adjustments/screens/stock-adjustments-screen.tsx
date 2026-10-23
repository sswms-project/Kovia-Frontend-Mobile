import { useRouter } from 'expo-router';
import { Scale } from 'lucide-react-native';
import { useState } from 'react';

import type { FilterOption } from '@/components/ui/filter-chips';
import { ListCard } from '@/components/ui/list-card';
import { PagedList } from '@/components/ui/paged-list';
import { formatDisplayDateTime } from '@/lib/date-format';

import { useStockAdjustmentsQuery } from '../hooks/use-stock-adjustments';
import {
  ADJUSTMENT_STATUS_LABEL,
  ADJUSTMENT_STATUS_TONE,
  type StockAdjustmentStatus,
} from '../stock-adjustments.types';

const STATUS_VALUES: readonly StockAdjustmentStatus[] = ['Pending', 'Approved', 'Rejected'];
const STATUS_OPTIONS: readonly FilterOption<StockAdjustmentStatus>[] = STATUS_VALUES.map((status) => ({
  value: status,
  label: ADJUSTMENT_STATUS_LABEL[status] ?? status,
}));

const formatQuantity = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

export function StockAdjustmentsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<StockAdjustmentStatus | null>(null);
  const query = useStockAdjustmentsQuery({ status: status ?? undefined });

  return (
    <PagedList
      query={query}
      keyExtractor={(voucher) => voucher.id}
      loadingMessage="Đang tải phiếu điều chỉnh…"
      emptyIcon={Scale}
      emptyTitle="Chưa có phiếu điều chỉnh"
      emptyDescription="Phiếu được tạo từ các dòng lệch của phiếu kiểm kê đã hoàn tất."
      filterLabel="Lọc theo trạng thái"
      filterOptions={STATUS_OPTIONS}
      filterValue={status}
      onFilterChange={setStatus}
      renderItem={(voucher) => (
        <ListCard
          title={voucher.code}
          subtitle={voucher.cycleCountCode ? `Kiểm kê ${voucher.cycleCountCode}` : undefined}
          lines={[
            voucher.reason,
            `${voucher.warehouseName} · ${voucher.lineCount} dòng`,
            `Tăng +${formatQuantity(voucher.totalIncrease)} · Giảm ${formatQuantity(voucher.totalDecrease)}`,
            `${voucher.createdByName} · ${formatDisplayDateTime(new Date(voucher.createdAt))}`,
          ]}
          pill={{
            label: ADJUSTMENT_STATUS_LABEL[voucher.status] ?? voucher.status,
            tone: ADJUSTMENT_STATUS_TONE[voucher.status] ?? 'neutral',
          }}
          onPress={() =>
            router.push({ pathname: '/catalog/stock-adjustments/[adjustmentId]', params: { adjustmentId: voucher.id } })
          }
        />
      )}
    />
  );
}
