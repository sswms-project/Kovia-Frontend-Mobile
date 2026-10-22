import { router } from 'expo-router';
import { ClipboardList } from 'lucide-react-native';
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { PagedList } from '@/components/ui/paged-list';
import { ListCard } from '@/components/ui/list-card';
import { AlertBanner } from '@/components/ui/alert-banner';
import { WarehouseWorkspaceControl, WarehouseWorkspaceGate } from '@/components/warehouse-workspace';
import { formatDisplayDateTime } from '@/lib/date-format';
import { useDiscrepancies } from '../hooks/use-discrepancies';
import { DISCREPANCY_STATUS, DISCREPANCY_TYPE, type DiscrepancyStatus } from '../discrepancies.schema';

export function DiscrepanciesScreen() {
  const [status, setStatus] = useState<DiscrepancyStatus | null>(null);
  const query = useDiscrepancies(status ?? undefined);
  if (!query.workspace.canView) return <WarehouseWorkspaceGate access={query.workspace.access} message="Bạn chưa có quyền xem báo cáo tại kho này." />;
  return <PagedList query={query} keyExtractor={(item) => item.id}
    header={<View style={styles.header}><WarehouseWorkspaceControl access={query.workspace.access} />
      <AlertBanner title="Báo cáo hiện trường tại kho" description="Lập báo cáo từ dòng tồn cụ thể. Báo cáo không tự điều chỉnh tồn; quản lý xử lý tiếp trên web." /></View>}
    filterLabel="Trạng thái xử lý" filterValue={status} onFilterChange={setStatus}
    filterOptions={Object.entries(DISCREPANCY_STATUS).map(([value, label]) => ({ value: value as DiscrepancyStatus, label }))}
    loadingMessage="Đang tải báo cáo…" emptyIcon={ClipboardList} emptyTitle="Chưa có báo cáo phù hợp"
    emptyDescription="Vào Tồn kho, chọn vị trí/lô và báo chênh lệch khi có bằng chứng thực tế."
    renderItem={(item) => <ListCard title={item.code} subtitle={`${DISCREPANCY_TYPE[item.type]} · ${DISCREPANCY_STATUS[item.status]}`}
      lines={[`${item.sku} · ${item.productName}`, `${item.slotCode} · ${item.lotNumber ?? 'Không theo lô'}`, `Chênh lệch: ${item.observedDifference}`,
        `Người báo: ${item.reportedByName}`, formatDisplayDateTime(new Date(item.createdAt))]}
      onPress={() => router.push({ pathname: '/catalog/discrepancies/[id]', params: { id: item.id } })} />} />;
}
const styles = StyleSheet.create({ header: { gap: 12, paddingHorizontal: 20 } });
