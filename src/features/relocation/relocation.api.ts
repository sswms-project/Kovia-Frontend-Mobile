import type { AxiosRequestConfig } from 'axios';

import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { inventoryListSchema } from '@/features/inventory-lookup/inventory-lookup.schema';

import { assertRelocationScope, sameRelocationId } from './relocation';
import { relocationCommandSchema, relocationProductSchema, relocationRecommendationsSchema, relocationSourceSchema,
  relocationTaskSchema, relocationUnitsSchema, type RelocationCommand, type RelocationLine } from './relocation.schema';

const id = nonEmptyDotNetGuidSchema('Mã công việc không hợp lệ.');
export const relocationApi = {
  load: async (taskId: string, warehouseId: string, userId: string, signal?: AbortSignal) => {
    id.parse(taskId);
    return assertRelocationScope(relocationTaskSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(
      `/my-warehouse-tasks/relocation/${taskId}`, { signal }))), taskId, warehouseId, userId);
  },
  recommendations: async (taskId: string, lineId: string, quantity: number, signal?: AbortSignal) => {
    id.parse(taskId); id.parse(lineId);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Nhập số lượng cần chuyển trước khi tải gợi ý.');
    return relocationRecommendationsSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(
      `/my-warehouse-tasks/relocation/${taskId}/lines/${lineId}/recommendations`, { params: { quantity }, signal })));
  },
  source: async (warehouseId: string, line: RelocationLine, signal?: AbortSignal) => {
    id.parse(warehouseId);
    const [productResponse, unitsResponse] = await Promise.all([
      api.get<ApiResponse<unknown>>(`/products/${line.productId}`, { signal }),
      api.get<ApiResponse<unknown>>('/units', { signal }),
    ]);
    const product = relocationProductSchema.parse(unwrap(productResponse));
    const unit = relocationUnitsSchema.parse(unwrap(unitsResponse)).find(row => sameRelocationId(row.id, product.unitId));
    if (!unit || !sameRelocationId(product.id, line.productId)) throw new Error('Chưa xác định được đơn vị cơ sở của dòng hàng.');
    // Search the exact product/location pages; never substitute another lot or stock row.
    for (let pageNumber = 1; pageNumber <= 20; pageNumber++) {
      const page = inventoryListSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/inventory', {
        signal, params: { warehouseId, productId: line.productId, slotId: line.sourceSlotId, pageNumber, pageSize: 100 },
      })));
      if (page.items.some(row => !sameRelocationId(row.warehouseId, warehouseId) || !sameRelocationId(row.productId, line.productId) || !sameRelocationId(row.slotId, line.sourceSlotId)))
        throw new Error('Dữ liệu tồn nguồn không khớp phạm vi.');
      const stock = page.items.find(row => sameRelocationId(row.id, line.sourceInventoryStockId));
      if (stock) return relocationSourceSchema.parse({ stock, product, unit });
      if (pageNumber * page.pageSize >= page.totalCount || !page.items.length) break;
    }
    throw new Error('Chưa tìm thấy đúng tồn nguồn được giao. Không thể xác nhận chuyển; hãy tải lại hoặc liên hệ quản lý.');
  },
  execute: async (taskId: string, body: RelocationCommand, assertCurrentContext: () => void) => {
    id.parse(taskId); const parsed = relocationCommandSchema.parse(body); assertCurrentContext();
    const config: AxiosRequestConfig & { assertCurrentContext: () => void } = { assertCurrentContext };
    const result = unwrap(await api.post<ApiResponse<unknown>>(`/my-warehouse-tasks/relocation/${taskId}/execute`, parsed, config));
    return result;
  },
};
