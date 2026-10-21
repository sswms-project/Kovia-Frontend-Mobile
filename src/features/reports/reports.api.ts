import type { PageResult } from '@/hooks/use-paged-query';
import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { ReportDefinition, ReportRow } from './reports.types';

export interface ReportParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly search?: string;
}

// Export to xlsx is skipped: it streams a file the phone has no use for.
export const reportsApi = {
  getCatalog: () => api.get<ApiResponse<ReportDefinition[]>>('/reports/catalog').then(unwrap),
  getReport: (type: string, params: ReportParams) =>
    api.get<ApiResponse<PageResult<ReportRow>>>(`/reports/${type}`, { params }).then(unwrap),
};
