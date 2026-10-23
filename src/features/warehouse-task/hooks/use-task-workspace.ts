import { useMemo } from 'react';

import { P } from '@/config/permission-codes';
import type { TaskScope } from '@/features/my-tasks/my-tasks';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';

export function useTaskWorkspace() {
  const access = useWarehouseAccess();
  const canView = access.ready && !!access.profile.data?.permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN);
  const { identity, warehouseId, signature, revision } = access.selection;
  const scope = useMemo<TaskScope | null>(() => canView && identity && warehouseId && signature
    ? { identity, warehouseId, signature, revision } : null, [canView, identity, warehouseId, signature, revision]);
  return { access, canView, scope };
}
