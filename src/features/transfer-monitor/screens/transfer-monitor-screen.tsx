import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { ListCard } from '@/components/ui/list-card';
import { PagedList } from '@/components/ui/paged-list';
import { SelectionField } from '@/components/ui/selection-field';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePagedQuery } from '@/hooks/use-paged-query';
import { useTransferMonitorAccess } from '../hooks/use-transfer-monitor';
import { transferMonitorApi } from '../transfer-monitor.api';
import { TRANSFER_STATUS_LABEL } from '../transfer-monitor.schema';

export function TransferMonitorScreen() {
  const { access, allowed, key } = useTransferMonitorAccess();
  const [direction, setDirection] = useState<'source' | 'destination'>('source');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const keyword = useDebouncedValue(search.trim(), 300);
  const query = usePagedQuery([...key, direction, keyword, status], (page, size) => transferMonitorApi.list(access.selection.warehouseId!, direction, keyword, status, page, size), allowed);
  if (!allowed) return <View><AlertBanner title="Chọn kho và kiểm tra quyền xem điều chuyển." /><Button label="Kiểm tra quyền" onPress={() => { void access.refresh(); }} /></View>;
  return <PagedList query={query} keyExtractor={item => item.id} emptyTitle="Không có phiếu điều chuyển phù hợp"
    searchText={search} onSearchChange={setSearch} searchPlaceholder="Tìm mã phiếu điều chuyển" filterLabel="Trạng thái phiếu"
    filterOptions={['PendingSourceAcceptance', 'InProgress', 'AwaitingResolution', 'Completed', 'Cancelled'].map(value => ({ value, label: TRANSFER_STATUS_LABEL[value] }))}
    filterValue={status} onFilterChange={setStatus} header={<SelectionField label="Hướng điều chuyển" value={direction}
      options={[{ value: 'source', label: 'Xuất từ kho đang chọn' }, { value: 'destination', label: 'Nhận về kho đang chọn' }]}
      onChange={value => setDirection(value === 'destination' ? 'destination' : 'source')} />}
    renderItem={item => <ListCard title={item.transferCode} subtitle={`${item.sourceWarehouseName} → ${item.destinationWarehouseName}`}
      lines={[`${item.lineCount} dòng sản phẩm`, ...item.hasPendingPickEscalation ? ['Có vướng mắc lấy hàng chờ quản lý'] : [],
        ...item.hasOpenDiscrepancy ? ['Có chênh lệch cần xử lý'] : [], ...item.hasOpenFeedback ? ['Có phản hồi đang mở'] : []]}
      pill={{ label: TRANSFER_STATUS_LABEL[item.status] ?? item.status, tone: item.hasOpenDiscrepancy ? 'warning' : 'neutral' }}
      onPress={() => router.push({ pathname: '/catalog/transfers/[id]', params: { id: item.id } })} />} />;
}
