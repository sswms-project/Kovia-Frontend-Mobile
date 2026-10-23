import type { AxiosRequestConfig } from 'axios';

import { rejectReasonSchema } from '@/features/approvals/approvals.schema';
import type { PageResult } from '@/hooks/use-paged-query';
import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import type {
  StockAdjustmentAllowedActions,
  StockAdjustmentStatus,
  StockAdjustmentVoucher,
} from './stock-adjustments.types';

export interface StockAdjustmentListParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly status?: StockAdjustmentStatus;
}

interface GuardedConfig extends AxiosRequestConfig { assertCurrentContext: () => void }

const parseId = (id: string) => nonEmptyDotNetGuidSchema('Mã phiếu điều chỉnh không hợp lệ.').parse(id);

// Only the voucher flow is exposed: single-line adjustments come from damage cases / discrepancies.
export const stockAdjustmentsApi = {
  list: (params: StockAdjustmentListParams) =>
    api.get<ApiResponse<PageResult<StockAdjustmentVoucher>>>('/stock-adjustments/vouchers', { params }).then(unwrap),
  get: (id: string) => api.get<ApiResponse<StockAdjustmentVoucher>>(`/stock-adjustments/vouchers/${parseId(id)}`).then(unwrap),
  allowedActions: (id: string) =>
    api.get<ApiResponse<StockAdjustmentAllowedActions>>(`/stock-adjustments/vouchers/${parseId(id)}/allowed-actions`).then(unwrap),
  // Approving posts stock movements for every kept line; the BE has no version/commandId, so a repeat call hits a 409.
  approve: (id: string, selfApprovalAcknowledged: boolean, assertCurrentContext: () => void) => {
    const config: GuardedConfig = { assertCurrentContext };
    return api.post<ApiResponse<unknown>>(
      `/stock-adjustments/vouchers/${parseId(id)}/approve`, { selfApprovalAcknowledged, excludedLineIds: [] }, config,
    ).then(unwrap);
  },
  reject: (id: string, reason: string, assertCurrentContext: () => void) => {
    const config: GuardedConfig = { assertCurrentContext };
    return api.post<ApiResponse<unknown>>(
      `/stock-adjustments/vouchers/${parseId(id)}/reject`, { reason: rejectReasonSchema.parse(reason) }, config,
    ).then(unwrap);
  },
};
