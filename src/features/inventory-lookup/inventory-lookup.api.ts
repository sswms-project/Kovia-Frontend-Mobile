import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { assertBarcodeScope, assertInventoryScope, exactInventoryFilter } from './inventory-lookup';
import { barcodeMatchSchema, barcodeResultSchema, inventoryListSchema, lookupInputSchema,
  type BarcodeMatch, type LookupInput } from './inventory-lookup.schema';

export const inventoryLookupApi = {
  resolve: async (warehouseId: string, input: LookupInput, signal?: AbortSignal) => {
    nonEmptyDotNetGuidSchema('Vui lòng chọn kho.').parse(warehouseId);
    const parsed = lookupInputSchema.parse(input);
    const response = await api.get<ApiResponse<unknown>>('/inventory/barcode-lookup', {
      params: { warehouseId, ...parsed }, signal,
    });
    return assertBarcodeScope(barcodeResultSchema.parse(unwrap(response)), warehouseId, parsed.kind);
  },
  list: async (warehouseId: string, match: BarcodeMatch | null, pageNumber: number, signal?: AbortSignal) => {
    nonEmptyDotNetGuidSchema('Vui lòng chọn kho.').parse(warehouseId);
    if (!Number.isInteger(pageNumber) || pageNumber < 1) throw new Error('Trang không hợp lệ.');
    if (match && barcodeMatchSchema.parse(match).warehouseId !== warehouseId)
      throw new Error('Kết quả tra mã không thuộc kho đang chọn.');
    const response = await api.get<ApiResponse<unknown>>('/inventory', {
      params: { warehouseId, pageNumber, pageSize: 20, ...(match ? exactInventoryFilter(match) : {}) }, signal,
    });
    return assertInventoryScope(inventoryListSchema.parse(unwrap(response)), warehouseId, match);
  },
};
