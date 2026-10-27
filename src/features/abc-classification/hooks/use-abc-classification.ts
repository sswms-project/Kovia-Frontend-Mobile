import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { P } from '@/config/permission-codes';
import { useCan } from '@/features/auth/hooks/use-can';
import { useInventoryWorkspace } from '@/features/inventory/hooks/use-inventory-workspace';
import { warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';
import { logApiError } from '@/lib/api-error';

import { abcClassificationApi } from '../abc-classification.api';
import type { RunAbcBody } from '../abc-classification.types';

const ABC_QUERY_KEY = ['abc-classification'] as const;

export function useAbcClassificationQuery() {
  const workspace = useInventoryWorkspace();
  const { canView, warehouseId } = workspace;
  const canRun = useCan(P.PRODUCTS_CONFIGURE_POLICY);
  const query = useQuery({
    queryKey: canView ? warehouseQueryKey('abc-classification', {}) : [...ABC_QUERY_KEY, 'disabled'],
    enabled: canView,
    queryFn: ({ signal }) => abcClassificationApi.list(warehouseId, signal),
    staleTime: 30_000, retry: false,
  });
  return { ...query, workspace, canRun };
}

export function useRunAbcMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: (body: RunAbcBody) => abcClassificationApi.run(body),
    onError: logApiError,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ABC_QUERY_KEY }); },
  });
}
