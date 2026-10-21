import type { HubConnection } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { toast } from 'sonner-native';
import { z } from 'zod';

import { useAuth } from '@/features/auth/auth.store';
import { logger } from '@/lib/logger';
import { createNotificationConnection } from '@/lib/realtime';

const MAX_START_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;
const MAX_REMEMBERED_IDS = 100;

const notificationCreatedSchema = z.object({ notificationId: z.string(), type: z.string() });

/**
 * Keeps one notification hub connection open while the user is signed in and the app is in the
 * foreground. The event carries no text, so it only toasts and refetches the notification list.
 */
export function useNotificationRealtime() {
  const signedIn = useAuth((state) => state.signedIn);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!signedIn) return;

    let connection: HubConnection | null = null;
    let isDisposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const seenIds = new Set<string>();
    const refreshNotifications = () => void queryClient.invalidateQueries({ queryKey: ['notifications'] });

    function handleCreated(payload: unknown) {
      const parsed = notificationCreatedSchema.safeParse(payload);
      if (!parsed.success) return;

      // A role change revokes the session; the user must sign in again to get the new permissions.
      if (parsed.data.type === 'SessionRevoked') {
        useAuth.setState({ notice: 'Quyền của bạn đã thay đổi. Vui lòng đăng nhập lại.' });
        void useAuth.getState().clearSession();
        return;
      }
      if (seenIds.has(parsed.data.notificationId)) return;
      if (seenIds.size >= MAX_REMEMBERED_IDS) seenIds.clear();
      seenIds.add(parsed.data.notificationId);
      toast('Bạn có thông báo mới.');
      refreshNotifications();
    }

    async function start(attempt = 1): Promise<void> {
      if (isDisposed || connection) return;
      const next = createNotificationConnection();
      next.on('NotificationCreated', handleCreated);
      // Events sent while disconnected are lost, so resync the list after every reconnect.
      next.onreconnected(refreshNotifications);
      connection = next;
      try {
        await next.start();
        refreshNotifications();
      } catch (error) {
        logger.warn('Notification hub failed to start', error);
        if (connection === next) connection = null;
        if (!isDisposed && attempt < MAX_START_ATTEMPTS) {
          retryTimer = setTimeout(() => void start(attempt + 1), RETRY_DELAY_MS * attempt);
        }
      }
    }

    async function stop() {
      clearTimeout(retryTimer);
      const current = connection;
      connection = null;
      if (current) await current.stop().catch(() => undefined);
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void start();
      else void stop();
    });
    void start();

    return () => {
      isDisposed = true;
      subscription.remove();
      void stop();
    };
  }, [signedIn, queryClient]);
}
