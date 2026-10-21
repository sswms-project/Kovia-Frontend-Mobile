import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import { receiptActionsSchema, receiptSchema } from '@/features/receiving/receiving.schema';
import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { AllocationScopeError } from './smart-allocation.api';

const id = nonEmptyDotNetGuidSchema('Mã phiếu nhận không hợp lệ.');
const queueSchema = z.object({ items: z.array(z.object({ id, warehouseId: id, receiptCode: z.string() })), totalCount: z.number().int().nonnegative() });
export const receiptReviewApi = {
  queue: async (warehouseId: string, pageNumber: number, signal?: AbortSignal) => {
    id.parse(warehouseId);
    const result = queueSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/goods-receipts', {
      params: { warehouseId, status: 'PendingApproval', pageNumber, pageSize: 20 }, signal,
    })));
    if (result.items.some(row => row.warehouseId !== warehouseId)) throw new AllocationScopeError('Phiếu nhận không thuộc kho đang chọn.');
    return result;
  },
  context: async (receiptId: string, warehouseId: string, signal?: AbortSignal) => {
    id.parse(receiptId); id.parse(warehouseId);
    const receipt = receiptSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/goods-receipts/${receiptId}`, { signal })));
    if (receipt.id !== receiptId || receipt.warehouseId !== warehouseId) throw new AllocationScopeError('Phiếu nhận không thuộc kho đang chọn.');
    const actions = receiptActionsSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/goods-receipts/${receiptId}/allowed-actions`, { signal })));
    return { receipt, actions };
  },
  approve: async (receiptId: string, body: { expectedVersion: string; commandId: string; keepAtReceiving: boolean; selfApprovalAcknowledged: boolean }, assertCurrentContext: () => void) => {
    id.parse(receiptId); id.parse(body.commandId); assertCurrentContext();
    const config: AxiosRequestConfig & { assertCurrentContext: () => void } = { assertCurrentContext };
    return unwrap(await api.post<ApiResponse<unknown>>(`/goods-receipts/${receiptId}/approve`, body, config));
  },
};
