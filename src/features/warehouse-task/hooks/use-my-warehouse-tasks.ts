import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { assertTaskActionScope, taskScopeMatches } from '@/features/my-tasks/my-tasks';
import { profileQueryKey, warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { ApiError } from '@/lib/api';
import { logApiError } from '@/lib/api-error';

import { warehouseTaskApi } from '../warehouse-task.api';
import type { MyWarehouseTask, MyWarehouseTaskListResponse, MyWarehouseTaskQuery, WarehouseTaskAction } from '../warehouse-task.types';
import { useTaskWorkspace } from './use-task-workspace';

export const WAREHOUSE_TASKS_QUERY_KEY = ['warehouse-tasks'] as const;
const PAGE_SIZE = 20;
export type MyWarehouseTaskFilters = Omit<MyWarehouseTaskQuery, 'pageNumber' | 'pageSize' | 'warehouseId' | 'assignedTo'>;
const getNextPageNumber = (lastPage: MyWarehouseTaskListResponse) =>
  lastPage.pageNumber * lastPage.pageSize < lastPage.totalCount ? lastPage.pageNumber + 1 : undefined;

function useTaskFeed(filters: MyWarehouseTaskFilters, history: boolean) {
  const workspace = useTaskWorkspace();
  const { scope, access } = workspace;
  const userId = access.profile.data?.id;
  const query = useInfiniteQuery({
    queryKey: scope ? warehouseQueryKey('warehouse-task-feed', { filters, history }) : ['warehouse-task-feed', 'disabled', history],
    enabled: !!scope && !!userId,
    queryFn: ({ pageParam, signal }) => {
      if (!scope || !userId) throw new ApiError('Chọn kho và xác minh quyền truy cập trước khi tải công việc.', 403);
      const params = { ...filters, warehouseId: scope.warehouseId, pageNumber: pageParam, pageSize: PAGE_SIZE };
      return history ? warehouseTaskApi.getHistory(params, userId, signal) : warehouseTaskApi.getCurrent(params, userId, signal);
    },
    initialPageParam: 1,
    getNextPageParam: getNextPageNumber,
    staleTime: 15_000,
    refetchInterval: workspace.canView ? 30_000 : false,
  });
  return { ...query, workspace };
}

export function useMyWarehouseTasksQuery(filters: MyWarehouseTaskFilters) { return useTaskFeed(filters, false); }
export function useMyWarehouseTaskHistoryQuery(filters: MyWarehouseTaskFilters) { return useTaskFeed(filters, true); }
export function flattenTasks(data: InfiniteData<MyWarehouseTaskListResponse> | undefined): readonly MyWarehouseTask[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}

interface ManageTaskVariables {
  readonly task: MyWarehouseTask;
  readonly action: WarehouseTaskAction;
  readonly reason?: string;
}

export function useManageMyWarehouseTaskMutation() {
  const client = useQueryClient();
  const { scope } = useTaskWorkspace();
  const invalidate = () => Promise.all([
    client.invalidateQueries({ queryKey: ['warehouse'] }),
    client.invalidateQueries({ queryKey: WAREHOUSE_TASKS_QUERY_KEY }),
    client.invalidateQueries({ queryKey: ['dashboard-overview'] }),
    client.invalidateQueries({ queryKey: ['notifications'] }),
  ]);
  return useMutation({
    retry: false,
    mutationFn: async ({ task, action, reason }: ManageTaskVariables) => {
      const operationScope = scope;
      const assertCurrentContext = () => {
        if (!operationScope || !taskScopeMatches(operationScope, useWarehouseSelection.getState()))
          throw new ApiError('Kho hoặc phiên làm việc đã thay đổi. Vui lòng mở lại công việc.', 409);
        assertTaskActionScope(operationScope, task, action, client.getQueryData<UserProfile>(profileQueryKey), useAuth.getState().signedIn);
      };
      assertCurrentContext();
      if (!operationScope) throw new ApiError('Vui lòng chọn kho làm việc.', 403);
      const current = await warehouseTaskApi.find(operationScope.warehouseId, task.assignedTo ?? '', task.taskType, task.id, false);
      assertCurrentContext();
      if (!current.task || current.history || current.task.executionStatus !== task.executionStatus || current.task.updatedAt !== task.updatedAt)
        throw new ApiError('Dữ liệu công việc đã thay đổi. Vui lòng tải lại trước khi tiếp tục.', 409);
      await warehouseTaskApi.action(task.taskType, task.id, action, reason, assertCurrentContext);
      return operationScope;
    },
    onSuccess: async (operationScope) => {
      if (taskScopeMatches(operationScope, useWarehouseSelection.getState())) await invalidate();
    },
    onError: (error) => { logApiError(error); void invalidate(); },
  });
}
