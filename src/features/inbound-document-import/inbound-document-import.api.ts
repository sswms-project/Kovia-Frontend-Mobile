import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { documentImportSchema, type PickedDocument, type ReviewForm } from './inbound-document-import.schema';

const guid = nonEmptyDotNetGuidSchema('Mã chứng từ không hợp lệ.');
const BASE = '/inbound-document-imports';
// OCR runs synchronously on the server, so a single upload can take far longer than the default 15 s.
const OCR_TIMEOUT_MS = 120_000;

export interface StartImportInput { readonly document: PickedDocument; readonly inboundRequestId: string; readonly warehouseId: string }

export function toReviewBody(importId: string, inboundRequestId: string, form: ReviewForm) {
  return {
    id: importId, inboundRequestId, acknowledgeWarehouseMismatch: form.acknowledgeWarehouseMismatch,
    header: Object.fromEntries(Object.entries(form.header).map(([key, value]) => [key, value.trim() || null])),
    lines: form.lines.map(line => ({
      sourceLineNumber: line.sourceLineNumber, inboundRequestItemId: line.inboundRequestItemId,
      confirmedQuantity: Number(line.confirmedQuantity), damagedQuantity: Number(line.damagedQuantity || 0),
      exceptionReason: line.exceptionReason || null,
      lotNumber: line.isLotTracked ? line.lotNumber || null : null,
      manufacturedDate: line.isLotTracked ? line.manufacturedDate || null : null,
      expiryDate: line.isLotTracked ? line.expiryDate || null : null,
    })),
  };
}

export const inboundDocumentImportApi = {
  start: async ({ document, inboundRequestId, warehouseId }: StartImportInput) => {
    guid.parse(inboundRequestId);
    guid.parse(warehouseId);
    const data = new FormData();
    data.append('InboundRequestId', inboundRequestId);
    data.append('WarehouseId', warehouseId);
    data.append('File', document.file ?? ({ uri: document.uri, type: document.mimeType, name: document.fileName } as unknown as Blob));
    const response = await api.post<ApiResponse<unknown>>(BASE, data,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: OCR_TIMEOUT_MS });
    return guid.parse(unwrap(response));
  },
  get: async (importId: string, signal?: AbortSignal) => {
    guid.parse(importId);
    return documentImportSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`${BASE}/${importId}`, { signal })));
  },
  review: async (importId: string, inboundRequestId: string, form: ReviewForm) => {
    guid.parse(importId);
    await api.put<ApiResponse<unknown>>(`${BASE}/${importId}/review`, toReviewBody(importId, inboundRequestId, form));
  },
  createDraftReceipt: async (importId: string) => {
    guid.parse(importId);
    return guid.parse(unwrap(await api.post<ApiResponse<unknown>>(`${BASE}/${importId}/draft-receipt`)));
  },
};
