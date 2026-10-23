import { useQuery } from '@tanstack/react-query';

import { usePagedQuery } from '@/hooks/use-paged-query';

import { reportsApi } from '../reports.api';
import type { ReportRow } from '../reports.types';

export const REPORTS_QUERY_KEY = ['reports'] as const;

export function useReportCatalogQuery() {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, 'catalog'],
    queryFn: reportsApi.getCatalog,
    staleTime: 10 * 60_000,
  });
}

export function useReportQuery(type: string, search: string | undefined) {
  return usePagedQuery<ReportRow>([...REPORTS_QUERY_KEY, type, search], (pageNumber, pageSize) =>
    reportsApi.getReport(type, { pageNumber, pageSize, search }),
  );
}
