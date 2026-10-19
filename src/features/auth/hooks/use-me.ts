import { useQuery } from '@tanstack/react-query';

import { authApi } from '../auth.api';

export const ME_QUERY_KEY = ['auth', 'me'] as const;

const ME_STALE_TIME_MS = 5 * 60_000;

/** Current user's role and effective permissions. The BE stays the source of truth. */
export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: authApi.getMe,
    staleTime: ME_STALE_TIME_MS,
  });
}
