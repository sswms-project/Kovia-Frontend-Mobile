import { api, unwrap, type ApiResponse } from '@/lib/api';

import { notificationListSchema } from './notifications.schema';

export const notificationsApi = {
  list: (pageSize = 10, pageNumber = 1, signal?: AbortSignal, isRead?: boolean) =>
    api
      .get<ApiResponse<unknown>>('/notifications', { params: { pageNumber, pageSize, isRead }, signal })
      .then(unwrap).then((data) => notificationListSchema.parse(data)),
  markRead: (id: string) => api.put<ApiResponse<unknown>>(`/notifications/${id}/read`).then(unwrap),
  markAllRead: () => api.put<ApiResponse<unknown>>('/notifications/read-all').then(unwrap),
};
