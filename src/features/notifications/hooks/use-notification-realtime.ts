import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { profileQueryKey } from '@/features/warehouse-access/warehouse-access';
import { API_BASE_URL } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';

import { assertNotificationContext } from '../notifications';

export function useNotificationRealtime(enabled: boolean, identity: string | null, signature: string | null) {
  const client = useQueryClient();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [connectionState, setConnectionState] = useState<{ signature: string | null; connected: boolean } | null>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!enabled || !identity || !signature || !active) return;
    let disposed = false;
    const assertCurrent = () => {
      if (disposed) throw new Error('Kết nối thông báo đã đóng.');
      assertNotificationContext(identity, signature, client.getQueryData<UserProfile>(profileQueryKey), useAuth.getState().signedIn);
    };
    const refresh = () => {
      if (disposed) return;
      try { assertCurrent(); void client.invalidateQueries({ queryKey: ['notifications', identity] }); }
      catch { /* An access transition closes this subscription; no payload is rendered directly. */ }
    };
    const connection = new HubConnectionBuilder().withUrl(`${API_BASE_URL.replace(/\/api$/, '')}/hubs/notifications`, {
      accessTokenFactory: async () => { assertCurrent(); const tokens = await tokenStorage.get(); assertCurrent(); return tokens?.accessToken ?? ''; },
    }).configureLogging(LogLevel.None).withAutomaticReconnect().build();
    connection.on('NotificationCreated', refresh);
    connection.onreconnecting(() => { if (!disposed) setConnectionState({ signature, connected: false }); });
    connection.onreconnected(() => { if (!disposed) { setConnectionState({ signature, connected: true }); refresh(); } });
    connection.onclose(() => { if (!disposed) setConnectionState({ signature, connected: false }); });
    void connection.start().then(() => {
      if (disposed) { void connection.stop(); return; }
      setConnectionState({ signature, connected: true }); refresh();
    }).catch(() => { if (!disposed) setConnectionState({ signature, connected: false }); });
    return () => { disposed = true; connection.off('NotificationCreated', refresh); void connection.stop().catch(() => undefined); };
  }, [client, enabled, identity, signature, active]);
  return enabled && active && connectionState?.signature === signature && connectionState.connected;
}
