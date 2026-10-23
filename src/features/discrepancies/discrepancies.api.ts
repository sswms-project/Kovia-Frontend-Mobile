import type { AxiosRequestConfig } from 'axios';
import { ApiError, api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { discrepancyCommandSchema, discrepancyEvidenceSchema, discrepancyPageSchema, type DiscrepancyCommand, type DiscrepancyStatus } from './discrepancies.schema';

export const discrepanciesApi = {
  list: async (warehouseId: string, pageNumber: number, status?: DiscrepancyStatus, signal?: AbortSignal) => {
    const data = discrepancyPageSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/inventory/discrepancies', {
      params: { warehouseId, pageNumber, pageSize: 20, status }, signal,
    })));
    if (data.pageNumber !== pageNumber || data.pageSize !== 20 || data.items.some((item) => item.warehouseId.toLowerCase() !== warehouseId.toLowerCase()))
      throw new ApiError('Báo cáo không khớp kho hoặc phân trang đang xem.', 403);
    return data;
  },
  create: async (body: DiscrepancyCommand, assertCurrentContext: () => void) => {
    assertCurrentContext();
    const config: AxiosRequestConfig & { assertCurrentContext: () => void } = { assertCurrentContext };
    return nonEmptyDotNetGuidSchema('Máy chủ trả mã báo cáo không hợp lệ.').parse(unwrap(
      await api.post<ApiResponse<unknown>>('/inventory/discrepancies', discrepancyCommandSchema.parse(body), config)));
  },
  addEvidence: async (reportId: string, evidenceIds: readonly string[], expectedVersion: string, assertCurrentContext: () => void) => {
    assertCurrentContext();
    const config: AxiosRequestConfig & { assertCurrentContext: () => void } = { assertCurrentContext };
    return unwrap(await api.post<ApiResponse<unknown>>(`/inventory/discrepancies/${nonEmptyDotNetGuidSchema('Mã báo cáo không hợp lệ.').parse(reportId)}/evidence`,
      discrepancyEvidenceSchema.parse({ reportId, evidenceIds, expectedVersion }), config));
  },
};
