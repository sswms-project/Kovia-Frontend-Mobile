import { ApiError, api, unwrap, type ApiResponse } from '@/lib/api';
import { assertTaskListScope } from '@/features/my-tasks/my-tasks';
import { warehouseTaskListSchema } from '@/features/my-tasks/my-tasks.schema';
import { myTasksApi } from '@/features/my-tasks/my-tasks.api';

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
  find: async (warehouseId: string, userId: string, taskType: WarehouseTaskType, taskId: string, history: boolean, signal?: AbortSignal) => {
    if (!history) {
      const task = await findInFeed(warehouseId, userId, taskType, taskId, false, signal);
      if (task) return { task, history: false };
    }
    return { task: await findInFeed(warehouseId, userId, taskType, taskId, true, signal), history: true };
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
async function findInFeed(warehouseId: string, userId: string, taskType: WarehouseTaskType, taskId: string, history: boolean, signal?: AbortSignal) {
  for (let pageNumber = 1; pageNumber <= 20; pageNumber += 1) {
    const data = await readTasks(history ? '/my-warehouse-tasks/history' : '/my-warehouse-tasks',
      { warehouseId, taskType, pageNumber, pageSize: 100 }, userId, signal);
    if (data.pageNumber !== pageNumber || data.pageSize > 100) throw new Error('Phân trang công việc chưa hợp lệ. Vui lòng tải lại.');
    const task = data.items.find((item) => item.id.toLowerCase() === taskId.toLowerCase() && item.taskType === taskType);
    if (task) return task;
    if (data.pageNumber * data.pageSize >= data.totalCount) return null;
    if (!data.items.length) throw new Error('Danh sách công việc đã thay đổi. Vui lòng tải lại trước khi tiếp tục.');
  }
  throw new ApiError('Chưa tải đủ dữ liệu để xác định công việc. Vui lòng mở chứng từ trên web hoặc liên hệ quản lý.', 422);
}
