import type { AxiosRequestConfig } from 'axios';
import type { z } from 'zod';

import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { assertStockIssueScope } from './stock-issue';
import { dispatchCommandSchema, executionActionsSchema, pickingCommandSchema, stockIssueSchema } from './stock-issue.schema';

const id = nonEmptyDotNetGuidSchema('Mã phiếu xuất không hợp lệ.');
function guarded(assertCurrentContext: () => void): AxiosRequestConfig & { assertCurrentContext: () => void } { return { assertCurrentContext }; }
export const stockIssueApi = {
  detail: async (documentId: string, warehouseId: string, userId: string, signal?: AbortSignal) => {
    id.parse(documentId);
    return assertStockIssueScope(stockIssueSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/stock-issue-requests/${documentId}`, { signal }))), warehouseId, userId);
  },
  actions: async (documentId: string, signal?: AbortSignal) => {
    id.parse(documentId);
    return executionActionsSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/stock-issue-requests/${documentId}/allowed-actions`, { signal })));
  },
  pick: async (documentId: string, body: z.infer<typeof pickingCommandSchema>, assertCurrentContext: () => void) => {
    id.parse(documentId); assertCurrentContext();
    const result = unwrap(await api.post<ApiResponse<unknown>>(`/stock-issue-requests/${documentId}/picks`, pickingCommandSchema.parse(body), guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
  dispatch: async (documentId: string, body: z.infer<typeof dispatchCommandSchema>, assertCurrentContext: () => void) => {
    id.parse(documentId); assertCurrentContext();
    const result = unwrap(await api.post<ApiResponse<unknown>>(`/stock-issue-requests/${documentId}/dispatch`, dispatchCommandSchema.parse(body), guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
};
