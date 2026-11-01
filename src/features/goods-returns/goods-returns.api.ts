import type { PageResult } from '@/hooks/use-paged-query';
import type { AxiosRequestConfig } from 'axios';
import { ApiError, api, unwrap, type ApiResponse } from '@/lib/api';
import { rejectReasonSchema } from '@/features/approvals/approvals.schema';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { goodsReturnSchema } from './goods-returns.schema';

import type { GoodsReturnRequest, GoodsReturnStatus } from './goods-returns.types';

export interface GoodsReturnListParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: GoodsReturnStatus;
}

export const goodsReturnsApi = {
  list: (params: GoodsReturnListParams) =>
    api.get<ApiResponse<PageResult<GoodsReturnRequest>>>('/goods-return-requests', { params }).then(unwrap),
  get: async (id: string) => {
    nonEmptyDotNetGuidSchema('Mã phiếu trả không hợp lệ.').parse(id);
    const request = goodsReturnSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/goods-return-requests/${id}`)));
    if (request.id.toLowerCase() !== id.toLowerCase()) throw new ApiError('Phiếu trả không khớp chứng từ đang mở. Vui lòng tải lại.', 403);
    return request;
  },
  approve: (id: string, assertCurrentContext: () => void) => {
    nonEmptyDotNetGuidSchema('Mã phiếu trả không hợp lệ.').parse(id);
    const config: AxiosRequestConfig & { assertCurrentContext: () => void } = { assertCurrentContext };
    return api.post<ApiResponse<unknown>>(`/goods-return-requests/${id}/approve`, undefined, config).then(unwrap);
  },
  reject: (id: string, reason: string, assertCurrentContext: () => void) => {
    nonEmptyDotNetGuidSchema('Mã phiếu trả không hợp lệ.').parse(id);
    const config: AxiosRequestConfig & { assertCurrentContext: () => void } = { assertCurrentContext };
    return api.post<ApiResponse<unknown>>(`/goods-return-requests/${id}/reject`, { reason: rejectReasonSchema.parse(reason) }, config).then(unwrap);
  },
};
