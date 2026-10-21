import { DetailHeading, DetailScroll, InfoRow, Section } from '@/components/ui/detail-sections';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { formatDisplayDate } from '@/lib/date-format';

import { useWarehouseDetailQuery } from '../hooks/use-warehouse-directory';
import { WAREHOUSE_STATUS_LABEL } from '../warehouse-directory.types';

interface WarehouseDetailScreenProps {
  readonly warehouseId: string;
}

export function WarehouseDetailScreen({ warehouseId }: WarehouseDetailScreenProps) {
  const query = useWarehouseDetailQuery(warehouseId);

  return (
    <QueryBoundary query={query} loadingMessage="Đang tải thông tin kho…">
      {(warehouse) => (
        <DetailScroll isRefreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
          <DetailHeading
            title={warehouse.warehouseName}
            subtitle={`${warehouse.warehouseCode} · ${WAREHOUSE_STATUS_LABEL[warehouse.status] ?? warehouse.status}`}
          />
          <Section title="Thông tin kho">
            <InfoRow label="Địa chỉ" value={warehouse.address} />
            <InfoRow label="Số khu vực" value={warehouse.zoneCount} />
            <InfoRow label="Ngày tạo" value={formatDisplayDate(new Date(warehouse.createdAt))} />
            <InfoRow
              label="Cập nhật lần cuối"
              value={warehouse.modifiedAt ? formatDisplayDate(new Date(warehouse.modifiedAt)) : null}
            />
          </Section>
        </DetailScroll>
      )}
    </QueryBoundary>
  );
}
