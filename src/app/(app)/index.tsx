import { router } from 'expo-router';

import { WarehousePicker } from '@/features/warehouse-access/components/warehouse-picker';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';

export default function WarehouseScreen() {
  const access = useWarehouseAccess();
  return <WarehousePicker profile={access.profile.data} warehouses={access.snapshot?.warehouses ?? []}
    selected={access.warehouse} validated={access.validated} loading={access.profile.isFetching || (access.selection.transitioning && access.profile.isSuccess)}
    error={access.profile.error} notice={access.selection.notice} compatible={access.snapshot?.compatible ?? true}
    onSelect={access.choose} onRefresh={access.refresh} onProfile={() => router.push('/profile')} />;
}
