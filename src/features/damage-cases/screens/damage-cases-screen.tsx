import { ShieldAlert } from 'lucide-react-native';
import { useState } from 'react';

import type { FilterOption } from '@/components/ui/filter-chips';
import { PagedList } from '@/components/ui/paged-list';

import { DamageCaseCard } from '../components/damage-case-card';
import { useDamageCasesQuery } from '../hooks/use-damage-cases';
import { DAMAGE_STATUS_LABEL, type DamageCaseStatus } from '../damage-cases.types';

const STATUS_OPTIONS: readonly FilterOption<DamageCaseStatus>[] = [
  { value: 'Open', label: DAMAGE_STATUS_LABEL.Open ?? 'Đang giữ' },
  { value: 'Resolved', label: DAMAGE_STATUS_LABEL.Resolved ?? 'Đã xử lý' },
];

export function DamageCasesScreen() {
  const [status, setStatus] = useState<DamageCaseStatus | null>(null);
  const query = useDamageCasesQuery(status ?? undefined);

  return (
    <PagedList
      query={query}
      keyExtractor={(damageCase) => damageCase.id}
      renderItem={(damageCase) => <DamageCaseCard damageCase={damageCase} />}
      loadingMessage="Đang tải hồ sơ hàng hỏng…"
      emptyIcon={ShieldAlert}
      emptyTitle="Chưa có hồ sơ hàng hỏng"
      emptyDescription="Báo hàng hỏng từ màn chi tiết tồn kho."
      filterLabel="Lọc theo trạng thái"
      filterOptions={STATUS_OPTIONS}
      filterValue={status}
      onFilterChange={setStatus}
    />
  );
}
