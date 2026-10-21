import { useMutation, useQueryClient } from '@tanstack/react-query';

import { INVENTORY_QUERY_KEY } from '@/features/inventory/hooks/use-inventory';
import { usePagedQuery } from '@/hooks/use-paged-query';

import { damageCasesApi, type ReportDamageBody } from '../damage-cases.api';
import type { DamageCase, DamageCaseStatus } from '../damage-cases.types';

export const DAMAGE_CASES_QUERY_KEY = ['damage-cases'] as const;

export function useDamageCasesQuery(status: DamageCaseStatus | undefined) {
  return usePagedQuery<DamageCase>([...DAMAGE_CASES_QUERY_KEY, status], (pageNumber, pageSize) =>
    damageCasesApi.list({ pageNumber, pageSize, status }),
  );
}

/** A report moves stock into hold, so both the case list and the stock views are refetched. */
export function useReportDamageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReportDamageBody) => damageCasesApi.report(body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: DAMAGE_CASES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
    },
  });
}
