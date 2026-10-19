import { api, unwrap, type ApiResponse } from '@/lib/api';

import type {
  MyWarehouseTaskListResponse,
  MyWarehouseTaskQuery,
  WarehouseTaskAction,
} from './warehouse-task.types';

export const warehouseTaskApi = {
  getCurrent: (params: MyWarehouseTaskQuery) =>
    api.get<ApiResponse<MyWarehouseTaskListResponse>>('/my-warehouse-tasks', { params }).then(unwrap),
  getHistory: (params: MyWarehouseTaskQuery) =>
    api
      .get<ApiResponse<MyWarehouseTaskListResponse>>('/my-warehouse-tasks/history', { params })
      .then(unwrap),
  action: (taskType: string, taskId: string, action: WarehouseTaskAction, reason?: string) =>
    api
      .post(`/my-warehouse-tasks/${taskType}/${taskId}/actions`, { action, reason })
      .then(() => undefined),
};
