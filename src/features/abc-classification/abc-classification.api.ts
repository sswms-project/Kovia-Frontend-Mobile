import { api, unwrap, type ApiResponse } from '@/lib/api';

import { abcListSchema } from './abc-classification.schema';
import type { RunAbcBody } from './abc-classification.types';

export const abcClassificationApi = {
  list: async (warehouseId: string, signal?: AbortSignal) => {
    const items = abcListSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/inventory/abc-classification', { params: { warehouseId }, signal })));
    return items.filter((item) => item.warehouseId.toLowerCase() === warehouseId.toLowerCase());
  },
  run: async (body: RunAbcBody) => {
    await api.post<ApiResponse<unknown>>('/inventory/abc-classification/run', body);
  },
};
