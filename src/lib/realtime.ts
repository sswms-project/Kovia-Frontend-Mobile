import { HttpTransportType, HubConnectionBuilder, LogLevel, type HubConnection } from '@microsoft/signalr';

import { API_BASE_URL } from './api';
import { tokenStorage } from './token-storage';

// The hub is mapped outside /api, so the API suffix is stripped from the base URL.
const NOTIFICATION_HUB_URL = `${API_BASE_URL.replace(/\/api$/, '')}/hubs/notifications`;

const RECONNECT_DELAYS_MS = [0, 2000, 5000, 10000];

/**
 * Builds the notification hub connection. The access token is read on every (re)connect so a
 * refreshed token is picked up; long polling is excluded as the server does not use it.
 */
export function createNotificationConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(NOTIFICATION_HUB_URL, {
      accessTokenFactory: async () => (await tokenStorage.get())?.accessToken ?? '',
      transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents,
    })
    .withAutomaticReconnect(RECONNECT_DELAYS_MS)
    .configureLogging(LogLevel.Warning)
    .build();
}
