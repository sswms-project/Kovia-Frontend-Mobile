import type { AxiosRequestConfig } from 'axios';

import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { notificationFilterSchema, notificationListSchema } from './notifications.schema';

function guarded(assertCurrentContext: () => void): AxiosRequestConfig & { assertCurrentContext: () => void } { return { assertCurrentContext }; }
export const notificationsApi = {
  list: async (pageNumber: number, unreadOnly: boolean, search: string, signal?: AbortSignal) => {
    if (!Number.isInteger(pageNumber) || pageNumber < 1) throw new Error('Trang thông báo không hợp lệ.');
    const filter = notificationFilterSchema.parse({ search });
    return notificationListSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/notifications', {
      params: { pageNumber, pageSize: 20, isRead: unreadOnly ? false : undefined, search: filter.search || undefined }, signal,
    })));
  },
  read: async (id: string, assertCurrentContext: () => void) => {
    nonEmptyDotNetGuidSchema('Mã thông báo không hợp lệ.').parse(id); assertCurrentContext();
    const result = unwrap(await api.put<ApiResponse<unknown>>(`/notifications/${id}/read`, undefined, guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
  readAll: async (assertCurrentContext: () => void) => {
    assertCurrentContext();
    const result = unwrap(await api.put<ApiResponse<number>>('/notifications/read-all', undefined, guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
};
