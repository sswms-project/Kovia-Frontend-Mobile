import { QueryClient } from '@tanstack/react-query';

import { isApiErrorResponse } from './api-error';

const MAX_RETRIES = 1;

// 4xx is a deliberate server answer (e.g. 403 missing permission); retrying cannot change it.
const shouldRetry = (failureCount: number, error: unknown) =>
  failureCount < MAX_RETRIES &&
  !(isApiErrorResponse(error) && error.statusCode >= 400 && error.statusCode < 500);

// A singleton so auth can drop cached user data on sign-out without a React context.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetry, staleTime: 30_000 },
    // Offline mutations fail fast with an ApiError (status 0) instead of queueing until reconnect.
    mutations: { networkMode: 'always', retry: 0, gcTime: 0 },
  },
});
