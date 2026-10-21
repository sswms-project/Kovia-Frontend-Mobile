import { api, unwrap, type ApiResponse } from '@/lib/api';
import type { PageResult } from '@/hooks/use-paged-query';

import type { Supplier, SupplierStatus } from './supplier.types';

export interface SupplierListParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: SupplierStatus;
}

// Read-only on mobile: creating and editing suppliers needs manager permissions and stays on the web.
export const supplierApi = {
  list: (params: SupplierListParams) =>
    api.get<ApiResponse<PageResult<Supplier>>>('/suppliers', { params }).then(unwrap),
  get: (id: string) => api.get<ApiResponse<Supplier>>(`/suppliers/${id}`).then(unwrap),
};
