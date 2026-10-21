import { useQuery } from '@tanstack/react-query';

import { referenceDataApi } from '../reference-data.api';
import type { ReferenceStatus } from '../reference-data.types';

const STALE_TIME_MS = 5 * 60_000;

export function useUnitsQuery(status: ReferenceStatus) {
  return useQuery({
    queryKey: ['units', status],
    queryFn: () => referenceDataApi.getUnits(status),
    staleTime: STALE_TIME_MS,
  });
}

export function useCategoriesTreeQuery(status: ReferenceStatus) {
  return useQuery({
    queryKey: ['categories', 'all', status],
    queryFn: () => referenceDataApi.getCategories(status),
    staleTime: STALE_TIME_MS,
  });
}
