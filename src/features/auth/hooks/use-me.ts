import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth.store';
import { profileQueryKey } from '@/features/warehouse-access/warehouse-access';

import { authApi } from '../auth.api';

export const ME_QUERY_KEY = profileQueryKey;

/** Current user's role and effective permissions. The BE stays the source of truth. */
export function useMe() {
  const signedIn = useAuth((state) => state.signedIn);
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: ({ signal }) => authApi.getMe(signal),
    enabled: signedIn,
    staleTime: 60_000,
  });
}
