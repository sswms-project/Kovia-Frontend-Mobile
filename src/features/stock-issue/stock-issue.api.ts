import type { AxiosRequestConfig } from 'axios';
import type { z } from 'zod';

import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { assertStockIssueScope } from './stock-issue';
import { pickingCommandSchema, reportPickIssueCommandSchema, stockIssueSchema } from './stock-issue.schema';

const id = nonEmptyDotNetGuidSchema('Mã phiếu xuất không hợp lệ.');
function guarded(assertCurrentContext: () => void): AxiosRequestConfig & { assertCurrentContext: () => void } { return { assertCurrentContext }; }
export const stockIssueApi = {
  detail: async (documentId: string, warehouseId: string, userId: string, signal?: AbortSignal) => {
    id.parse(documentId);
    return assertStockIssueScope(stockIssueSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/stock-issue-requests/${documentId}`, { signal }))), warehouseId, userId);
  },
  pick: async (documentId: string, body: z.infer<typeof pickingCommandSchema>, assertCurrentContext: () => void) => {
    id.parse(documentId); assertCurrentContext();
    const result = unwrap(await api.post<ApiResponse<unknown>>(`/stock-issue-requests/${documentId}/picks`, pickingCommandSchema.parse(body), guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
  reportPickIssue: async (documentId: string, reason: string, assertCurrentContext: () => void) => {
    id.parse(documentId); assertCurrentContext();
    const body = reportPickIssueCommandSchema.parse({ stockIssueRequestId: documentId, reason });
    const result = unwrap(await api.post<ApiResponse<unknown>>(`/stock-issue-requests/${documentId}/report-pick-issue`, body, guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
  authorizeDispatch: async (documentId: string, assertCurrentContext: () => void) => {
    id.parse(documentId); assertCurrentContext();
    const result = unwrap(await api.post<ApiResponse<unknown>>(`/stock-issue-requests/${documentId}/authorize-dispatch`, undefined, guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
  dispatch: async (documentId: string, assertCurrentContext: () => void) => {
    id.parse(documentId); assertCurrentContext();
    const result = unwrap(await api.post<ApiResponse<unknown>>(`/stock-issue-requests/${documentId}/dispatch`, undefined, guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
};
