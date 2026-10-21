import { api, unwrap, type ApiResponse } from '@/lib/api';

import {
  cycleCountActionsSchema,
  cycleCountEvidenceSchema,
  cycleCountSchema,
} from './cycle-count.schema';

export interface RecordCountBody {
  readonly countedQuantity: number;
  readonly note: string | null;
  readonly countedDamagedQuantity: number | null;
  readonly countMethod: 'Manual' | 'Scanned';
  readonly scannedBarcode: string | null;
  readonly damageReason: string | null;
  readonly damageEvidenceIds: readonly string[];
}

export interface EvidenceAsset {
  readonly uri: string;
  readonly mimeType: string;
  readonly fileName: string;
  readonly file?: File;
}

export const cycleCountApi = {
  get: async (id: string) =>
    cycleCountSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/cycle-counts/${id}`))),
  getActions: async (id: string) =>
    cycleCountActionsSchema.parse(
      unwrap(await api.get<ApiResponse<unknown>>(`/cycle-counts/${id}/allowed-actions`)),
    ),
  start: (id: string) => api.post(`/cycle-counts/${id}/start`),
  recordCount: (id: string, itemId: string, body: RecordCountBody) =>
    api.put(`/cycle-counts/${id}/items/${itemId}`, body),
  submit: (id: string) => api.post(`/cycle-counts/${id}/submit`),
  // The file is orphaned until its id is sent in recordCount, which attaches it to the item.
  uploadEvidence: async (warehouseId: string, asset: EvidenceAsset) => {
    const data = new FormData();
    data.append('warehouseId', warehouseId);
    data.append(
      'file',
      asset.file ?? ({ uri: asset.uri, type: asset.mimeType, name: asset.fileName } as unknown as Blob), // RN FormData file shape
    );
    return cycleCountEvidenceSchema.parse(
      unwrap(
        await api.post<ApiResponse<unknown>>('/cycle-counts/evidence', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
      ),
    );
  },
};
