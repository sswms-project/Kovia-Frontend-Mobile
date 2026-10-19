import type { AxiosRequestConfig } from 'axios';

import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { assertTaskListScope, taskListParams } from './my-tasks';
import { taskActionSchema, taskFiltersSchema, taskTypeSchema, warehouseTaskListSchema,
  type TaskActionInput, type TaskFilters } from './my-tasks.schema';

export const myTasksApi = {
  list: async (warehouseId: string, userId: string, filters: TaskFilters, signal?: AbortSignal) => {
    const parsed = taskFiltersSchema.parse(filters);
    const response = await api.get<ApiResponse<unknown>>(
      parsed.history ? '/my-warehouse-tasks/history' : '/my-warehouse-tasks',
      { params: taskListParams(warehouseId, parsed), signal },
    );
    return assertTaskListScope(warehouseTaskListSchema.parse(unwrap(response)), warehouseId, userId);
  },
  action: (taskType: string, taskId: string, input: TaskActionInput, assertCurrentContext?: () => void) => {
    const type = taskTypeSchema.parse(taskType);
    nonEmptyDotNetGuidSchema('Mã công việc không hợp lệ').parse(taskId);
    if (type === 'Picking' || type === 'DamagedStock')
      throw new Error('Loại công việc này được xử lý trong màn hình nghiệp vụ riêng.');
    const body = taskActionSchema.parse(input);
    const config: AxiosRequestConfig & { assertCurrentContext?: () => void } = { assertCurrentContext };
    return api.post<ApiResponse<unknown>>(`/my-warehouse-tasks/${type}/${taskId}/actions`, body, config).then(unwrap);
  },
};
