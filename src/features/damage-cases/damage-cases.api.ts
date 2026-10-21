import { z } from 'zod';

import type { EvidenceAsset, EvidencePhoto } from '@/hooks/use-evidence-photos';
import type { PageResult } from '@/hooks/use-paged-query';
import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { DamageCase, DamageCaseStatus } from './damage-cases.types';

const evidenceSchema = z.object({ id: z.string(), fileName: z.string() });

export interface DamageCaseListParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly status?: DamageCaseStatus;
}

export interface ReportDamageBody {
  readonly productId: string;
  readonly warehouseId: string;
  readonly slotId: string;
  readonly lotId?: string;
  readonly quantity?: number;
  readonly reason: string;
  /** Idempotency key: the same id with the same body is a safe replay. */
  readonly commandId: string;
  readonly expectedStockVersion?: string;
  readonly evidenceIds: readonly string[];
}

export const damageCasesApi = {
  list: (params: DamageCaseListParams) =>
    api.get<ApiResponse<PageResult<DamageCase>>>('/inventory/damage-cases', { params }).then(unwrap),
  uploadEvidence: async (warehouseId: string, asset: EvidenceAsset): Promise<EvidencePhoto> => {
    const data = new FormData();
    data.append('warehouseId', warehouseId);
    data.append(
      'file',
      asset.file ?? ({ uri: asset.uri, type: asset.mimeType, name: asset.fileName } as unknown as Blob), // RN FormData file shape
    );
    return evidenceSchema.parse(
      unwrap(
        await api.post<ApiResponse<unknown>>('/inventory/evidence', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
      ),
    );
  },
  report: (body: ReportDamageBody) => api.post<ApiResponse<string>>('/inventory/damaged', body).then(unwrap),
};
