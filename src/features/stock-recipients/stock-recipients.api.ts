import type { PageResult } from '@/hooks/use-paged-query';
import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { RecipientStatus, StockRecipient } from './stock-recipients.types';

export interface RecipientListParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: RecipientStatus;
}

export const stockRecipientsApi = {
  list: (params: RecipientListParams) =>
    api.get<ApiResponse<PageResult<StockRecipient>>>('/stock-recipients', { params }).then(unwrap),
  get: (id: string) => api.get<ApiResponse<StockRecipient>>(`/stock-recipients/${id}`).then(unwrap),
};
