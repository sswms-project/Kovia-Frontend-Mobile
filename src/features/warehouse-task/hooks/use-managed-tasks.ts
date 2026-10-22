import { useInfiniteQuery } from '@tanstack/react-query';

import { P } from '@/config/permission-codes';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';
import { ApiError } from '@/lib/api';

import { warehouseTaskApi } from '../warehouse-task.api';
import type { WarehouseTaskExecutionStatus, WarehouseTaskType } from '../warehouse-task.types';

export function useManagedTasks(history: boolean, taskType: WarehouseTaskType | null, executionStatus: WarehouseTaskExecutionStatus | null) {
  const access = useWarehouseAccess();
  const allowed = access.ready && !!access.profile.data?.permissions.includes(P.WAREHOUSE_TASKS_VIEW_ALL);
  const warehouseId = access.warehouse?.id;
  const list = useInfiniteQuery({
    queryKey: allowed ? warehouseQueryKey('managed-warehouse-tasks', { history, taskType, executionStatus })
      : ['managed-warehouse-tasks', 'disabled', access.selection.identity, access.selection.revision],
    enabled: allowed && !!warehouseId,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      if (!allowed || !warehouseId) throw new ApiError('Bạn chưa có quyền giám sát công việc tại kho này.', 403);
      return warehouseTaskApi.getManaged({ warehouseId, pageNumber: pageParam, pageSize: 20,
        taskType: taskType ?? undefined, executionStatus: executionStatus ?? undefined }, history, signal);
    },
    getNextPageParam: (page) => page.pageNumber * page.pageSize < page.totalCount ? page.pageNumber + 1 : undefined,
    staleTime: 15_000,
    refetchInterval: allowed ? 30_000 : false,
    retry: false,
  });
  return { access, allowed, list };
}
