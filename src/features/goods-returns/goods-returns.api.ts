import type { PageResult } from '@/hooks/use-paged-query';
import type { AxiosRequestConfig } from 'axios';
import { ApiError, api, unwrap, type ApiResponse } from '@/lib/api';
import { rejectReasonSchema } from '@/features/approvals/approvals.schema';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { goodsReturnSchema, returnLocationPageSchema } from './goods-returns.schema';

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
  locations: async (warehouseId: string, ids: readonly string[], signal?: AbortSignal) => {
    const found: { id: string; path: string; active: boolean }[] = [];
    for (let pageNumber = 1; pageNumber <= 20; pageNumber++) {
      const page = returnLocationPageSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/warehouses/${warehouseId}/locations`, {
        params: { type: 'Slot', pageNumber, pageSize: 100 }, signal,
      })));
      found.push(...page.items.filter(item => item.type === 'Slot' && ids.includes(item.id)).map(item => ({
        id: item.id, path: [item.zoneCode, item.rackCode, item.code].filter(Boolean).join(' / '), active: item.lifecycleStatus === 'Active',
      })));
      if (ids.every(id => found.some(item => item.id === id)) || pageNumber * 100 >= page.totalCount) return found;
      if (!page.items.length) throw new Error('Danh sách vị trí đã thay đổi. Vui lòng tải lại.');
    }
    throw new Error('Chưa xác minh đủ vị trí nhận. Liên hệ quản lý kiểm tra trên web.');
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
  restock: (id: string, assertCurrentContext: () => void) => {
    nonEmptyDotNetGuidSchema('Mã phiếu trả không hợp lệ.').parse(id);
    const config: AxiosRequestConfig & { assertCurrentContext: () => void } = { assertCurrentContext };
    return api.post<ApiResponse<unknown>>(`/goods-return-requests/${id}/restock`, undefined, config).then(unwrap);
  },
};
