import { useMutation, useQueryClient } from '@tanstack/react-query';

import { INVENTORY_QUERY_KEY } from '@/features/inventory/hooks/use-inventory';
import { useInventoryWorkspace } from '@/features/inventory/hooks/use-inventory-workspace';
import { warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';
import { logApiError } from '@/lib/api-error';
import { usePagedQuery } from '@/hooks/use-paged-query';

import { damageCasesApi, type AddDamageEvidenceBody, type ReportDamageBody } from '../damage-cases.api';
import type { DamageCase, DamageCaseStatus } from '../damage-cases.types';

export const DAMAGE_CASES_QUERY_KEY = ['damage-cases'] as const;

export function useDamageCasesQuery(status: DamageCaseStatus | undefined) {
  const workspace = useInventoryWorkspace();
  const { canView, warehouseId } = workspace;
  const query = usePagedQuery<DamageCase>(canView ? warehouseQueryKey('damage-cases', status) : ['damage-cases', 'disabled'],
    (pageNumber, pageSize) => damageCasesApi.list({ pageNumber, pageSize, status, warehouseId }), canView);
  return { ...query, workspace };
}

/** Confirming a quantity moves stock into hold, so the case list and stock views are refetched. */
export function useAddDamageEvidenceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: ({ id, body, assertCurrentContext }: { id: string; body: AddDamageEvidenceBody; assertCurrentContext: () => void }) =>
      damageCasesApi.addEvidence(id, body, assertCurrentContext),
    onError: logApiError,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: DAMAGE_CASES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['warehouse'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** A report moves stock into hold, so both the case list and the stock views are refetched. */
export function useReportDamageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: ({ body, assertCurrentContext }: { body: ReportDamageBody; assertCurrentContext: () => void }) => damageCasesApi.report(body, assertCurrentContext),
    onError: logApiError,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: DAMAGE_CASES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['warehouse'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
