import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { assertReceiptScope, assertReceivingTask } from './receiving';
import { createReceiptCommandSchema, createReceiptFormSchema, locationSearchSchema, putAwayCommandSchema, putAwaySuggestionsSchema,
  receiptActionsSchema, receiptSchema, receivingLocationsSchema, receivingTasksSchema,
  submitReceiptCommandSchema, updateReceiptCommandSchema, evidenceSchema, isolateDamageCommandSchema, putAwayLayoutSchema } from './receiving.schema';

const guid = nonEmptyDotNetGuidSchema('Mã chứng từ không hợp lệ.');
function guarded(assertCurrentContext: () => void): AxiosRequestConfig & { assertCurrentContext: () => void } { return { assertCurrentContext }; }
function normalizeLines<T extends { lines: z.infer<typeof createReceiptCommandSchema>['lines'] }>(body: T) {
  return { ...body, lines: body.lines.map(line => ({ ...line,
    exceptionReason: line.exceptionReason || null, lotNumber: line.lotNumber || null,
    manufacturedDate: line.manufacturedDate || null, expiryDate: line.expiryDate || null,
  })) };
}
export const receivingApi = {
  layout: async (warehouseId: string, signal?: AbortSignal) => {
    guid.parse(warehouseId);
    return putAwayLayoutSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/warehouses/${warehouseId}/layout`, { signal })));
  },
  nextCode: async (signal?: AbortSignal) => createReceiptFormSchema.shape.receiptCode.parse(
    unwrap(await api.get<ApiResponse<unknown>>('/goods-receipts/next-code', { signal }))),
  uploadEvidence: async (warehouseId: string, asset: { uri: string; mimeType: string; fileName: string; file?: File }, assertCurrentContext: () => void) => {
    guid.parse(warehouseId);
    assertCurrentContext();
    const data = new FormData();
    data.append('warehouseId', warehouseId);
    data.append('file', asset.file ?? ({ uri: asset.uri, type: asset.mimeType, name: asset.fileName } as unknown as Blob));
    const evidence = evidenceSchema.parse(unwrap(await api.post<ApiResponse<unknown>>('/goods-receipts/receiving-evidence', data,
      { ...guarded(assertCurrentContext), headers: { 'Content-Type': 'multipart/form-data' } })));
    assertCurrentContext();
    if (evidence.warehouseId !== warehouseId) throw new Error('Bằng chứng không thuộc kho đang thao tác.');
    return evidence;
  },
  task: async (warehouseId: string, userId: string, inboundId: string, signal?: AbortSignal) => {
    [warehouseId, userId, inboundId].forEach(value => guid.parse(value));
    const response = await api.get<ApiResponse<unknown>>('/goods-receipts/receiving-tasks', {
      params: { warehouseId, assignedTo: userId, inboundRequestId: inboundId, pageSize: 20, pageNumber: 1 }, signal,
    });
    const result = receivingTasksSchema.parse(unwrap(response));
    if (result.items.length === 0) return null;
    if (result.items.length !== 1) throw new Error('Máy chủ chưa hỗ trợ truy vấn đúng công việc. Vui lòng cập nhật BE.');
    return assertReceivingTask(result.items[0], warehouseId, userId, inboundId);
  },
  receipt: async (receiptId: string, warehouseId: string, userId: string, mode: 'receiving' | 'putaway', inboundId?: string, signal?: AbortSignal) => {
    guid.parse(receiptId);
    const response = await api.get<ApiResponse<unknown>>(`/goods-receipts/${receiptId}`, { signal });
    return assertReceiptScope(receiptSchema.parse(unwrap(response)), warehouseId, userId, mode, inboundId);
  },
  actions: async (receiptId: string, signal?: AbortSignal) => {
    guid.parse(receiptId);
    return receiptActionsSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/goods-receipts/${receiptId}/allowed-actions`, { signal })));
  },
  locations: async (warehouseId: string, searchTerm: string, pageNumber: number, signal?: AbortSignal, forDamageIsolation = false, forPutAway = false) => {
    guid.parse(warehouseId);
    const parsed = locationSearchSchema.parse({ searchTerm });
    if (!Number.isInteger(pageNumber) || pageNumber < 1) throw new Error('Trang vị trí không hợp lệ.');
    const result = receivingLocationsSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/goods-receipts/receiving-locations', {
      params: { warehouseId, ...parsed, pageNumber, ...(forDamageIsolation ? { forDamageIsolation: true } : {}), ...(forPutAway ? { forPutAway: true } : {}) }, signal,
    })));
    if (forPutAway && result.items.some(item => item.isPutAwayLocation !== true))
      throw new Error('Máy chủ chưa hỗ trợ danh sách vị trí cất an toàn. Cần cập nhật BE trước khi cất hàng trên mobile.');
    return result;
  },
  create: async (body: z.infer<typeof createReceiptCommandSchema>, assertCurrentContext: () => void) =>
    guid.parse(unwrap(await api.post<ApiResponse<unknown>>('/goods-receipts', normalizeLines(createReceiptCommandSchema.parse(body)), guarded(assertCurrentContext)))),
  update: async (receiptId: string, body: z.infer<typeof updateReceiptCommandSchema>, assertCurrentContext: () => void) => {
    guid.parse(receiptId);
    return unwrap(await api.put<ApiResponse<unknown>>(`/goods-receipts/${receiptId}`, normalizeLines(updateReceiptCommandSchema.parse(body)), guarded(assertCurrentContext)));
  },
  submit: async (receiptId: string, body: z.infer<typeof submitReceiptCommandSchema>, assertCurrentContext: () => void) => {
    guid.parse(receiptId);
    if (body.documentEvidenceIds?.length) {
      assertCurrentContext();
      const detail = unwrap(await api.get<ApiResponse<unknown>>(`/goods-receipts/${receiptId}`));
      assertCurrentContext();
      if (!z.object({ documentEvidence: z.array(evidenceSchema) }).safeParse(detail).success)
        throw new Error('Máy chủ chưa hỗ trợ lưu ảnh phiếu giao hàng. Phiếu vẫn là nháp; cập nhật BE trước khi gửi kèm ảnh.');
    }
    return unwrap(await api.post<ApiResponse<unknown>>(`/goods-receipts/${receiptId}/submit`, submitReceiptCommandSchema.parse(body), guarded(assertCurrentContext)));
  },
  putAway: async (receiptId: string, body: z.infer<typeof putAwayCommandSchema>, assertCurrentContext: () => void) => {
    guid.parse(receiptId);
    return unwrap(await api.post<ApiResponse<unknown>>(`/goods-receipts/${receiptId}/putaway`, putAwayCommandSchema.parse(body), guarded(assertCurrentContext)));
  },
  isolateDamage: async (receiptId: string, body: z.infer<typeof isolateDamageCommandSchema>, assertCurrentContext: () => void) => {
    guid.parse(receiptId);
    return unwrap(await api.post<ApiResponse<unknown>>(`/goods-receipts/${receiptId}/isolate-damage`, isolateDamageCommandSchema.parse(body), guarded(assertCurrentContext)));
  },
  suggestions: async (receiptId: string, assertCurrentContext: () => void) => {
    guid.parse(receiptId);
    return putAwaySuggestionsSchema.parse(unwrap(await api.post<ApiResponse<unknown>>(`/goods-receipts/${receiptId}/putaway-suggestions`, {}, guarded(assertCurrentContext))));
  },
};
