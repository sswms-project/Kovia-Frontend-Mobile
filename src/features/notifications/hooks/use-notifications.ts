import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { P } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { getApiErrorMessage, logApiError } from '@/lib/api-error';

import { assertNotificationContext } from '../notifications';
import { notificationsApi } from '../notifications.api';
import { notificationsApi as workflowApi } from '../notifications-workflow.api';

export function useNotifications(pageSize = 10) {
  const access = useWarehouseAccess();
  const allowed = access.validated && !!access.profile.data?.permissions.includes(P.NOTIFICATIONS_VIEW);
  const { identity, signature, revision } = access.selection;
  const client = useQueryClient();
  const prefix = ['notifications', identity, signature, revision, 'preview'];
  const query = useQuery({ queryKey: [...prefix, pageSize],
    queryFn: ({ signal }) => notificationsApi.list(pageSize, 1, signal), enabled: allowed,
    staleTime: 15_000, refetchInterval: allowed ? 30_000 : false, retry: false,
  });
  const unread = useQuery({ queryKey: [...prefix, 'unread-count'],
    queryFn: ({ signal }) => notificationsApi.list(1, 1, signal, false), enabled: allowed,
    staleTime: 15_000, refetchInterval: allowed ? 30_000 : false, retry: false,
  });
  const assertCurrent = () => {
    const current = useWarehouseSelection.getState();
    if (current.identity !== identity || current.signature !== signature || current.revision !== revision)
      throw new Error('Phiên thông báo đã thay đổi.');
    assertNotificationContext(identity, signature, client.getQueryData<UserProfile>(profileQueryKey), useAuth.getState().signedIn);
  };
  const invalidate = () => client.invalidateQueries({ queryKey: ['notifications'] });
  const onError = (error: Error) => { logApiError(error); toast.error(getApiErrorMessage(error)); };
  const markRead = useMutation({ mutationFn: (id: string) => workflowApi.read(id, assertCurrent), onSuccess: invalidate, onError, retry: false });
  const markAllRead = useMutation({ mutationFn: () => workflowApi.readAll(assertCurrent), onSuccess: invalidate, onError, retry: false });
  return { ...query, allowed, items: query.isError ? [] : query.data?.items ?? [],
    unreadCount: unread.isSuccess ? unread.data.totalCount : null, markRead, markAllRead };
}
