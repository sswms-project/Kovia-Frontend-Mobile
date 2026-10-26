import { useQuery } from '@tanstack/react-query';
import { AlertBanner } from '@/components/ui/alert-banner';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { DetailHeading, DetailScroll, InfoRow, Section } from '@/components/ui/detail-sections';
import { useTransferMonitorAccess } from '../hooks/use-transfer-monitor';
import { transferMonitorApi } from '../transfer-monitor.api';
import { TRANSFER_STATUS_LABEL } from '../transfer-monitor.schema';
import { formatDisplayDateTime } from '@/lib/date-format';

export function TransferMonitorDetailScreen({ id }: { readonly id: string }) {
  const { access, allowed, key } = useTransferMonitorAccess();
  const query = useQuery({ queryKey: [...key, id], enabled: allowed, retry: false,
    queryFn: ({ signal }) => transferMonitorApi.get(id, access.selection.warehouseId!, signal) });
  if (!allowed) return <AlertBanner title="Chọn kho và kiểm tra quyền xem điều chuyển." />;
  return <QueryBoundary query={query} loadingMessage="Đang tải phiếu điều chuyển…">{data => <DetailScroll
    isRefreshing={query.isFetching} onRefresh={() => { void query.refetch(); }}>
    <DetailHeading title={data.transferCode} />
    <Section title="Tổng quan">
      <InfoRow label="Kho nguồn" value={data.sourceWarehouseName} /><InfoRow label="Kho nhận" value={data.destinationWarehouseName} />
      <InfoRow label="Trạng thái" value={TRANSFER_STATUS_LABEL[data.status] ?? data.status} />
      <InfoRow label="Lý do" value={data.reason} /><InfoRow label="Ghi chú" value={data.note} />
    </Section>
    {data.isLegacyWorkflow && <AlertBanner title="Chứng từ theo quy trình cũ" description="Xem lịch sử tại đây; xử lý tiếp trên web theo quy trình hiện có." />}
    {data.shipments?.map(shipment => <Section key={shipment.id} title={`Đợt ${shipment.shipmentNumber}`}>
      <InfoRow label="Trạng thái" value={TRANSFER_STATUS_LABEL[shipment.status] ?? shipment.status} />
      <InfoRow label="Người lấy" value={shipment.pickAssigneeName} /><InfoRow label="Người nhận" value={shipment.receiveAssigneeName} />
      <InfoRow label="Người cất" value={shipment.putAwayAssigneeName} />
      <InfoRow label="Thời điểm xuất" value={shipment.dispatchedAt ? formatDisplayDateTime(new Date(shipment.dispatchedAt)) : null} />
      <InfoRow label="Thời điểm nhận" value={shipment.receivedAt ? formatDisplayDateTime(new Date(shipment.receivedAt)) : null} />
      {shipment.lines.map(line => <Section key={line.id} title={`${line.sku} · ${line.productName}`}>
        <InfoRow label="Kế hoạch / đang lấy / đã xuất" value={`${line.plannedQuantity} / ${line.pickedQuantity} / ${line.dispatchedQuantity} ${data.items.find(item => item.id === line.itemId)?.baseUnitName ?? ''}`} />
        {line.openExceptionCount > 0 && <AlertBanner title={`${line.openExceptionCount} vướng mắc cần quản lý xử lý trên web`} />}
        {line.pendingReturnQuantity > 0 && <AlertBanner title={`Còn ${line.pendingReturnQuantity} cần xác nhận trả về vị trí`} />}
      </Section>)}
    </Section>)}
    <Section title="Sản phẩm">{data.items.map(item => <Section key={item.id} title={`${item.sku} · ${item.productName}`}>
      <InfoRow label="Đã xuất / đã nhận" value={`${item.dispatchedQuantity} / ${item.receivedQuantity} ${item.baseUnitName ?? item.unitName ?? ''}`} />
      <InfoRow label="Hỏng / thiếu" value={`${item.damagedQuantity} / ${item.missingQuantity}`} />
    </Section>)}</Section>
    {!!data.discrepancies?.length && <Section title="Chênh lệch">{data.discrepancies.map(item => <InfoRow key={item.id}
      label={`${item.sku} · ${item.productName}`} value={item.isOpen ? `Chưa xử lý hết (${item.resolvedQuantity}/${item.quantity})` : 'Đã đối soát'} />)}</Section>}
    <AlertBanner title="Theo dõi trên mobile" description="Phân công, duyệt, xử lý vướng mắc và đối soát chênh lệch thực hiện trên web. Không thao tác thay nhân viên." />
  </DetailScroll>}</QueryBoundary>;
}
