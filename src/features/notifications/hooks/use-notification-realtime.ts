import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { profileQueryKey } from '@/features/warehouse-access/warehouse-access';
import { API_BASE_URL } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';

import { assertNotificationContext } from '../notifications';

export function useNotificationRealtime(enabled: boolean, identity: string | null, signature: string | null, onRefresh?: (event?: unknown) => void, transfer?: { readonly id: string; readonly onChange: (event?: unknown) => void }) {
  const client = useQueryClient();
  const transferSession = useRef<string | null>(null);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [connectionState, setConnectionState] = useState<{ signature: string | null; connected: boolean } | null>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!enabled || !identity || !signature || !active) return;
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 5_000;
    let startedOnce = false;
    const assertCurrent = () => {
      if (disposed) throw new Error('Kết nối thông báo đã đóng.');
      assertNotificationContext(identity, signature, client.getQueryData<UserProfile>(profileQueryKey), useAuth.getState().signedIn);
    };
    const refresh = (event?: unknown) => {
      if (disposed) return;
      try {
        assertCurrent();
        void client.invalidateQueries({ queryKey: ['notifications', identity] });
        onRefresh?.(event);
      }
      catch { /* An access transition closes this subscription; no payload is rendered directly. */ }
    };
    const connection = new HubConnectionBuilder().withUrl(`${API_BASE_URL.replace(/\/api$/, '')}/hubs/notifications`, {
      accessTokenFactory: async () => { assertCurrent(); const tokens = await tokenStorage.get(); assertCurrent(); return tokens?.accessToken ?? ''; },
    }).configureLogging(LogLevel.None).withAutomaticReconnect().build();
    const transferChanged = (event: unknown) => {
      try { assertCurrent(); transfer?.onChange(event); } catch { /* Old sessions cannot update an active document. */ }
    };
    async function joinTransfer(reconnected: boolean) {
      if (!transfer) return;
      try {
        assertCurrent(); await connection.invoke('JoinTransfer', transfer.id); assertCurrent();
        const key = JSON.stringify([identity, signature, transfer.id]);
        const resumed = transferSession.current === key;
        transferSession.current = key;
        if (reconnected || resumed) transfer.onChange();
      } catch { if (!disposed) transferChanged(undefined); }
    }
    function scheduleStart() {
      if (disposed || retryTimer) return;
      try { assertCurrent(); } catch { return; }
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        refresh();
        start();
      }, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30_000);
    }
    function start() {
      if (disposed) return;
      void connection.start().then(() => {
        if (disposed) { void connection.stop().catch(() => undefined); return; }
        retryDelay = 5_000;
        setConnectionState({ signature, connected: true }); refresh(); void joinTransfer(startedOnce); startedOnce = true;
      }).catch(() => {
        if (!disposed) { setConnectionState({ signature, connected: false }); scheduleStart(); }
      });
    }
    connection.on('NotificationCreated', refresh);
    if (transfer) connection.on('TransferChanged', transferChanged);
    connection.onreconnecting(() => { if (!disposed) setConnectionState({ signature, connected: false }); });
    connection.onreconnected(() => {
      if (!disposed) { retryDelay = 5_000; setConnectionState({ signature, connected: true }); refresh(); void joinTransfer(true); }
    });
    connection.onclose(() => {
      if (!disposed) { setConnectionState({ signature, connected: false }); scheduleStart(); }
    });
    refresh();
    start();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      connection.off('NotificationCreated', refresh);
      if (transfer) connection.off('TransferChanged', transferChanged);
      void connection.stop().catch(() => undefined);
    };
  }, [client, enabled, identity, signature, active, onRefresh, transfer]);
  return enabled && active && connectionState?.signature === signature && connectionState.connected;
}
