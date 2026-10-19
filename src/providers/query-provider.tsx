import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import * as Network from 'expo-network';
import type { ReactNode } from 'react';

import { queryClient } from '@/lib/query-client';

// Lets TanStack Query pause fetches while offline and refetch when the connection returns.
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  });
  return () => subscription.remove();
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
