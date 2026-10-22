import { History } from 'lucide-react-native';
import { memo, useState } from 'react';

import type { FilterOption } from '@/components/ui/filter-chips';
import { ListCard } from '@/components/ui/list-card';
import { PagedList } from '@/components/ui/paged-list';
import { AlertBanner } from '@/components/ui/alert-banner';
import { useMe } from '@/features/auth/hooks/use-me';
import { USER_ROLES } from '@/config/roles';
import { WarehouseWorkspaceGate } from '@/components/warehouse-workspace';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDisplayDateTime } from '@/lib/date-format';

import { AUDIT_RANGE_LABEL, type AuditLogItem, type AuditRange } from '../audit-logs.types';
import { useAuditLogsQuery } from '../hooks/use-audit-logs';

const SEARCH_DEBOUNCE_MS = 350;

const RANGE_OPTIONS: readonly FilterOption<AuditRange>[] = (['today', 'week', 'month'] as const).map((range) => ({
  value: range,
  label: AUDIT_RANGE_LABEL[range],
}));

const AuditLogRow = memo(function AuditLogRow({ log }: { readonly log: AuditLogItem }) {
  const [expanded, setExpanded] = useState(false);
  const detailLines = expanded
    ? [
        log.description,
        log.reason ? `Lý do: ${log.reason}` : null,
        ...log.changes.map((change) => `${change.label}: ${change.before ?? '—'} → ${change.after ?? '—'}`),
        'Chạm để thu gọn',
      ]
    : ['Chạm để xem chi tiết'];

  return (
    <ListCard
      title={`${log.actionLabel} · ${log.entityTypeLabel}`}
      subtitle={log.referenceDisplay}
      lines={[`Người thực hiện: ${log.actorName}`, log.summary, formatDisplayDateTime(new Date(log.createdAt)), log.warehouseName, ...detailLines]}
      onPress={() => setExpanded((value) => !value)}
    />
  );
});

export function AuditLogsScreen() {
  const staff = useMe().data?.role === USER_ROLES.WarehouseStaff;
  const [range, setRange] = useState<AuditRange>('week');
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const state = useAuditLogsQuery(range, debouncedSearch || undefined);
  const { query } = state;
  if (!state.allowed) return <WarehouseWorkspaceGate access={state.access} message="Bạn chưa được cấp quyền xem nhật ký hoạt động." />;

  return (
    <PagedList
      header={<AlertBanner title={staff ? 'Nhật ký thao tác của bạn' : 'Nhật ký hoạt động trong doanh nghiệp'}
        description={staff ? 'Chỉ hiển thị các thao tác của tài khoản này.' : 'Bao gồm các nhân viên trong phạm vi bạn được phép xem. Đây không phải log quản trị nền tảng.'} />}
      query={query}
      keyExtractor={(log) => log.id}
      renderItem={(log) => <AuditLogRow log={log} />}
      loadingMessage="Đang tải hoạt động…"
      emptyIcon={History}
      emptyTitle="Chưa có hoạt động nào"
      emptyDescription="Thử mở rộng khoảng thời gian."
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Tìm hoạt động"
      filterLabel="Khoảng thời gian"
      filterOptions={RANGE_OPTIONS}
      filterValue={range}
      onFilterChange={(value) => setRange(value ?? 'week')}
    />
  );
}
