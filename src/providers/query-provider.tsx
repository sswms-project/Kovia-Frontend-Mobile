import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import * as Network from 'expo-network';
import type { ReactNode } from 'react';

import { resetWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { queryClient } from '@/lib/query-client';

export { queryClient } from '@/lib/query-client';

onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  });
  return () => subscription.remove();
});

export async function clearSessionQueries() {
  resetWarehouseSelection();
  await queryClient.cancelQueries();
  queryClient.clear();
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
