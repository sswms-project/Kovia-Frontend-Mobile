import { useQuery } from '@tanstack/react-query';

import { P } from '@/config/permission-codes';
import { useCan } from '@/features/auth/hooks/use-can';

import { homeApi } from '../home.api';

export function useOverview() {
  const allowed = useCan(P.DASHBOARD_VIEW);
  const query = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: ({ signal }) => homeApi.overview(30, signal),
    enabled: allowed,
    staleTime: 30_000,
  });
  return { ...query, allowed };
}
