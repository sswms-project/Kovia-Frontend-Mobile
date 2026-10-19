import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { logApiError } from '@/lib/api-error';

import { warehouseTaskApi } from '../warehouse-task.api';
import type {
  MyWarehouseTask,
  MyWarehouseTaskListResponse,
  MyWarehouseTaskQuery,
  WarehouseTaskAction,
} from '../warehouse-task.types';

export const WAREHOUSE_TASKS_QUERY_KEY = ['warehouse-tasks'] as const;

const PAGE_SIZE = 20;

export type MyWarehouseTaskFilters = Omit<MyWarehouseTaskQuery, 'pageNumber' | 'pageSize'>;

const getNextPageNumber = (lastPage: MyWarehouseTaskListResponse) =>
  lastPage.pageNumber * lastPage.pageSize < lastPage.totalCount ? lastPage.pageNumber + 1 : undefined;

/** Open tasks (queued, in progress, paused), paged. Cached per filter set. */
export function useMyWarehouseTasksQuery(filters: MyWarehouseTaskFilters) {
  return useInfiniteQuery({
    queryKey: [...WAREHOUSE_TASKS_QUERY_KEY, 'mine', filters],
    queryFn: ({ pageParam }) =>
      warehouseTaskApi.getCurrent({ ...filters, pageNumber: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: getNextPageNumber,
  });
}

/** Completed and cancelled tasks, paged. */
export function useMyWarehouseTaskHistoryQuery(filters: MyWarehouseTaskFilters) {
  return useInfiniteQuery({
    queryKey: [...WAREHOUSE_TASKS_QUERY_KEY, 'history', filters],
    queryFn: ({ pageParam }) =>
      warehouseTaskApi.getHistory({ ...filters, pageNumber: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: getNextPageNumber,
  });
}

export function flattenTasks(
  data: InfiniteData<MyWarehouseTaskListResponse> | undefined,
): readonly MyWarehouseTask[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}

interface ManageTaskVariables {
  readonly taskType: string;
  readonly taskId: string;
  readonly action: WarehouseTaskAction;
  readonly reason?: string;
}

export function useManageMyWarehouseTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskType, taskId, action, reason }: ManageTaskVariables) =>
      warehouseTaskApi.action(taskType, taskId, action, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WAREHOUSE_TASKS_QUERY_KEY }),
    // The screen shows the message in a toast.
    onError: logApiError,
  });
}
