import type { AxiosRequestConfig } from 'axios';
import { warehouseEvidenceSchema } from '@/lib/warehouse-contract.schema';

import type { EvidenceAsset, EvidencePhoto } from '@/hooks/use-evidence-photos';
import type { PageResult } from '@/hooks/use-paged-query';
import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { DamageCase, DamageCaseStatus } from './damage-cases.types';

function guarded(assertCurrentContext: () => void): AxiosRequestConfig & { assertCurrentContext: () => void } { return { assertCurrentContext }; }

export interface DamageCaseListParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly status?: DamageCaseStatus;
  readonly warehouseId: string;
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

export interface AddDamageEvidenceBody {
  readonly evidenceIds: readonly string[];
  readonly expectedCaseVersion: string;
  /** Required for an observation that has no confirmed quantity yet. */
  readonly confirmedQuantity?: number;
  readonly expectedStockVersion?: string;
}

export const damageCasesApi = {
  list: (params: DamageCaseListParams) =>
    api.get<ApiResponse<PageResult<DamageCase>>>('/inventory/damage-cases', { params }).then(unwrap),
  uploadEvidence: async (warehouseId: string, asset: EvidenceAsset, assertCurrentContext: () => void): Promise<EvidencePhoto> => {
    assertCurrentContext();
    const data = new FormData();
    data.append('warehouseId', warehouseId);
    data.append(
      'file',
      asset.file ?? ({ uri: asset.uri, type: asset.mimeType, name: asset.fileName } as unknown as Blob), // RN FormData file shape
    );
    const evidence = warehouseEvidenceSchema.parse(
      unwrap(
        await api.post<ApiResponse<unknown>>('/inventory/evidence', data, {
          ...guarded(assertCurrentContext), headers: { 'Content-Type': 'multipart/form-data' },
        }),
      ),
    );
    assertCurrentContext();
    if (evidence.warehouseId !== warehouseId) throw new Error('Bằng chứng không khớp kho đang báo hỏng.');
    return evidence;
  },
  addEvidence: (id: string, body: AddDamageEvidenceBody, assertCurrentContext: () => void) => {
    assertCurrentContext();
    return api.post(`/inventory/damage-cases/${id}/evidence`, body, guarded(assertCurrentContext));
  },
  report: (body: ReportDamageBody, assertCurrentContext: () => void) => {
    assertCurrentContext();
    return api.post<ApiResponse<string>>('/inventory/damaged', body, guarded(assertCurrentContext)).then(unwrap);
  },
};
