import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { P } from '@/config/permission-codes';
import { useCan } from '@/features/auth/hooks/use-can';

import { notificationsApi } from '../notifications.api';

export function useNotifications(pageSize = 10) {
  const allowed = useCan(P.NOTIFICATIONS_VIEW);
  const client = useQueryClient();
  const key = ['notifications', { pageSize }] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => notificationsApi.list(pageSize, 1, signal),
    enabled: allowed,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });

  const invalidate = () => client.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: invalidate });
  const markAllRead = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: invalidate });

  const items = query.data?.items ?? [];
  const unreadCount = items.filter((item) => !item.isRead).length;

  return { ...query, allowed, items, unreadCount, markRead, markAllRead };
}
