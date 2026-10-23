import { ApiError, api, unwrap, type ApiResponse } from '@/lib/api';
import { assertTaskListScope } from '@/features/my-tasks/my-tasks';
import { warehouseTaskListSchema } from '@/features/my-tasks/my-tasks.schema';
import { myTasksApi } from '@/features/my-tasks/my-tasks.api';
import { findPagedRecord, type RecordSearchCursor } from '@/lib/paged-record-search';

import type {
  MyWarehouseTaskQuery,
  WarehouseTaskAction,
  WarehouseTaskType,
} from './warehouse-task.types';

export const warehouseTaskApi = {
  getManaged: async (params: MyWarehouseTaskQuery & { warehouseId: string }, history: boolean, signal?: AbortSignal) => {
    const response = await api.get<ApiResponse<unknown>>(history ? '/warehouse-tasks/history' : '/warehouse-tasks', { params, signal });
    const data = warehouseTaskListSchema.parse(unwrap(response));
    if (data.pageNumber !== params.pageNumber || data.pageSize !== params.pageSize ||
      data.items.some((task) => task.warehouseId.toLowerCase() !== params.warehouseId.toLowerCase()))
      throw new ApiError('Danh sách giám sát không khớp kho hoặc phân trang đang chọn.', 403);
    return data;
  },
  getCurrent: (params: MyWarehouseTaskQuery & { warehouseId: string }, userId: string, signal?: AbortSignal) =>
    readTasks('/my-warehouse-tasks', params, userId, signal),
  getHistory: (params: MyWarehouseTaskQuery & { warehouseId: string }, userId: string, signal?: AbortSignal) =>
    readTasks('/my-warehouse-tasks/history', params, userId, signal),
  action: (taskType: string, taskId: string, action: WarehouseTaskAction, reason?: string, assertCurrentContext?: () => void) =>
    myTasksApi.action(taskType, taskId, { action, reason }, assertCurrentContext),
  find: async (warehouseId: string, userId: string, taskType: WarehouseTaskType, taskId: string, history: boolean, signal?: AbortSignal, cursor: RecordSearchCursor = { page: 1 }) => {
    if (!history && cursor.feed !== 'history') {
      const task = await findInFeed(warehouseId, userId, taskType, taskId, false, signal, cursor);
      if (task) { cursor.feed = undefined; return { task, history: false }; }
    }
    cursor.feed = 'history';
    const task = await findInFeed(warehouseId, userId, taskType, taskId, true, signal, cursor);
    cursor.feed = undefined;
    return { task, history: true };
  },
};

async function readTasks(route: string, params: MyWarehouseTaskQuery & { warehouseId: string }, userId: string, signal?: AbortSignal) {
  const response = await api.get<ApiResponse<unknown>>(route, { params, signal });
  const data = warehouseTaskListSchema.parse(unwrap(response));
  try { return assertTaskListScope(data, params.warehouseId, userId); }
  catch { throw new ApiError('Dữ liệu công việc không khớp kho hoặc tài khoản đang làm việc.', 403); }
}

// The current API has no generic GET-by-ID. Search only the authorized warehouse
// and task type, with an explicit bound; reaching the bound is not a 404.
async function findInFeed(warehouseId: string, userId: string, taskType: WarehouseTaskType, taskId: string, history: boolean, signal?: AbortSignal, cursor?: RecordSearchCursor) {
  return findPagedRecord(pageNumber => readTasks(history ? '/my-warehouse-tasks/history' : '/my-warehouse-tasks',
    { warehouseId, taskType, pageNumber, pageSize: 100 }, userId, signal),
    item => item.id.toLowerCase() === taskId.toLowerCase() && item.taskType === taskType, cursor, signal);
}
