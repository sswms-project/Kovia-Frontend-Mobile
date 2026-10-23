import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import type { RecordSearchCursor } from '@/lib/paged-record-search';

import { taskTypeSchema } from '@/features/my-tasks/my-tasks.schema';
import { warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';
import { ApiError } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { warehouseTaskApi } from '../warehouse-task.api';
import { useTaskWorkspace } from './use-task-workspace';

export function useTaskDetail(taskType: string, taskId: string, history: boolean, warehouseId?: string) {
  const workspace = useTaskWorkspace();
  const { scope, access } = workspace;
  const type = taskTypeSchema.safeParse(taskType);
  const id = nonEmptyDotNetGuidSchema('Mã công việc không hợp lệ.').safeParse(taskId);
  const validRoute = type.success && id.success;
  const userId = access.profile.data?.id;
  const cursor = useRef<{ key: string; value: RecordSearchCursor }>({ key: '', value: { page: 1 } });
  const cursorKey = JSON.stringify([scope, taskType, taskId, history]);
  const query = useQuery({
    queryKey: scope ? warehouseQueryKey('warehouse-task-detail', { taskType, taskId, history, warehouseId }) : ['warehouse-task-detail', 'disabled'],
    enabled: !!scope && !!userId && validRoute,
    queryFn: ({ signal }) => {
      if (!scope || !userId || !type.success || !id.success) throw new ApiError('Công việc chưa hợp lệ.', 400);
      if (warehouseId && warehouseId.toLowerCase() !== scope.warehouseId.toLowerCase())
        throw new ApiError('Công việc thuộc kho khác với kho đang chọn. Vui lòng chọn lại công việc.', 403);
      if (cursor.current.key !== cursorKey) cursor.current = { key: cursorKey, value: { page: 1 } };
      return warehouseTaskApi.find(scope.warehouseId, userId, type.data, id.data, history, signal, cursor.current.value);
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: false,
  });
  return { ...query, workspace, validRoute };
}
