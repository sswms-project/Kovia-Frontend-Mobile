import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { P } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey } from '@/features/warehouse-access/warehouse-access';
import { logApiError } from '@/lib/api-error';

import { assertNotificationContext } from '../notifications';
import { notificationsApi } from '../notifications-workflow.api';
import { notificationFilterSchema, type NotificationFilter } from '../notifications.schema';
import { useNotificationRealtime } from './use-notification-realtime';

export function useWorkflowNotifications() {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const { identity, signature, revision } = access.selection;
  const canView = access.validated && !!access.profile.data?.tenantId && !!access.profile.data.permissions.includes(P.NOTIFICATIONS_VIEW);
  const prefix = ['notifications', identity, signature, revision];
  const key = JSON.stringify(prefix);
  const [filters, setFilters] = useState({ pageNumber: 1, unreadOnly: true, search: '' });
  const [notice, setNotice] = useState<{ key: string; message: string } | null>(null);
  const lock = useRef(false);
  const form = useForm<NotificationFilter>({ resolver: zodResolver(notificationFilterSchema), defaultValues: { search: '' } });
  const list = useQuery({ queryKey: [...prefix, filters], enabled: canView, retry: false, refetchInterval: canView ? 30_000 : false,
    queryFn: ({ signal }) => notificationsApi.list(filters.pageNumber, filters.unreadOnly, filters.search, signal) });
  const connected = useNotificationRealtime(canView, identity, signature);
  const mutation = useMutation<unknown, Error, { originalKey: string; id: string | null }>({ retry: false,
    mutationFn: async ({ originalKey, id }) => {
      const assertCurrent = () => {
        if (originalKey !== key) throw new Error('Phiên thông báo đã thay đổi.');
        assertNotificationContext(identity, signature, client.getQueryData<UserProfile>(profileQueryKey), useAuth.getState().signedIn);
      };
      return id ? notificationsApi.read(id, assertCurrent) : notificationsApi.readAll(assertCurrent);
    }, onError: logApiError, onSuccess: async (_, original) => {
      if (original.originalKey !== key) return;
      setNotice({ key, message: original.id ? 'Đã đánh dấu thông báo là đã đọc.' : 'Đã đánh dấu tất cả thông báo là đã đọc.' });
      await client.invalidateQueries({ queryKey: ['notifications', identity] });
    } });
  async function markRead(id: string | null) {
    if (!canView || lock.current) return false;
    if (id && !list.data?.items.some(item => item.id === id)) return false;
    lock.current = true;
    try { await mutation.mutateAsync({ originalKey: key, id }); return true; } catch { return false; /* The mutation error is displayed, with no optimistic read state. */ }
    finally { lock.current = false; }
  }
  return { access, canView, list, form, filters, connected, mutation, markRead, notice: notice?.key === key ? notice.message : null,
    search: async () => { await form.handleSubmit(values => setFilters(current => ({ ...current, search: values.search, pageNumber: 1 })))(); },
    toggleUnread: () => setFilters(current => ({ ...current, unreadOnly: !current.unreadOnly, pageNumber: 1 })),
    page: (pageNumber: number) => { if (pageNumber > 0) setFilters(current => ({ ...current, pageNumber })); } };
}
