import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { resetWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { retry: 0, gcTime: 0 },
  },
});

export async function clearSessionQueries() {
  resetWarehouseSelection();
  await queryClient.cancelQueries();
  queryClient.clear();
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
