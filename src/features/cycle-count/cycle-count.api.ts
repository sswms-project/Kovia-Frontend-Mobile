import type { AxiosRequestConfig } from 'axios';
import type { z } from 'zod';

import { warehouseActionsSchema as executionActionsSchema, warehouseEvidenceSchema as evidenceSchema } from '@/lib/warehouse-contract.schema';
import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { assertCountScope } from './cycle-count';
import { countExecutionSchema, countFormSchema, cycleCountSchema } from './cycle-count.schema';

const id = nonEmptyDotNetGuidSchema('Mã kiểm kê không hợp lệ.');
function guarded(assertCurrentContext: () => void): AxiosRequestConfig & { assertCurrentContext: () => void } { return { assertCurrentContext }; }
export const cycleCountApi = {
  detail: async (documentId: string, warehouseId: string, userId: string, signal?: AbortSignal) => {
    id.parse(documentId);
    return assertCountScope(cycleCountSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/cycle-counts/${documentId}`, { signal }))), warehouseId, userId);
  },
  actions: async (documentId: string, signal?: AbortSignal) => {
    id.parse(documentId);
    return executionActionsSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/cycle-counts/${documentId}/allowed-actions`, { signal })));
  },
  execute: async (documentId: string, action: 'start' | 'submit', body: z.infer<typeof countExecutionSchema>, assertCurrentContext: () => void) => {
    id.parse(documentId); assertCurrentContext();
    const result = unwrap(await api.post<ApiResponse<unknown>>(`/cycle-counts/${documentId}/${action}`, countExecutionSchema.parse(body), guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
  record: async (documentId: string, itemId: string, values: z.infer<typeof countFormSchema>, command: z.infer<typeof countExecutionSchema>, assertCurrentContext: () => void) => {
    id.parse(documentId); id.parse(itemId); assertCurrentContext();
    const body = countFormSchema.parse(values);
    const result = unwrap(await api.put<ApiResponse<unknown>>(`/cycle-counts/${documentId}/items/${itemId}`, { ...body,
      note: body.note || null, scannedBarcode: body.countMethod === 'Scanned' ? body.scannedBarcode : null,
      damageReason: body.countedDamagedQuantity > 0 ? body.damageReason : null, ...countExecutionSchema.parse(command) }, guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
  uploadEvidence: async (warehouseId: string, asset: { uri: string; mimeType: string; fileName: string; file?: File }, assertCurrentContext: () => void) => {
    id.parse(warehouseId); assertCurrentContext();
    const body = new FormData(); body.append('warehouseId', warehouseId);
    body.append('file', asset.file ?? ({ uri: asset.uri, name: asset.fileName, type: asset.mimeType } as unknown as Blob));
    const result = evidenceSchema.parse(unwrap(await api.post<ApiResponse<unknown>>('/cycle-counts/evidence', body,
      { ...guarded(assertCurrentContext), headers: { 'Content-Type': 'multipart/form-data' } })));
    assertCurrentContext();
    if (result.warehouseId !== warehouseId) throw new Error('Ảnh không thuộc kho đang kiểm kê.');
    return result;
  },
};
