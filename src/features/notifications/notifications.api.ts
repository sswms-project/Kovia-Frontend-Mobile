import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { NotificationsResponse } from './notifications.types';

export const notificationsApi = {
  list: (pageSize = 10, pageNumber = 1, signal?: AbortSignal) =>
    api
      .get<ApiResponse<NotificationsResponse>>('/notifications', { params: { pageNumber, pageSize }, signal })
      .then(unwrap),
  markRead: (id: string) => api.put<ApiResponse<unknown>>(`/notifications/${id}/read`).then(unwrap),
  markAllRead: () => api.put<ApiResponse<unknown>>('/notifications/read-all').then(unwrap),
};
