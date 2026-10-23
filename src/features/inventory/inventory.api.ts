import { ApiError, api, unwrap, type ApiResponse } from '@/lib/api';
import { findPagedRecord, type RecordSearchCursor } from '@/lib/paged-record-search';

import { scopedInventoryListSchema, stockMovementListSchema } from './inventory.schema';
import type { InventoryListQuery, StockMovementListQuery } from './inventory.types';

const sameId = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

function validatePage(data: { pageNumber: number; pageSize: number; totalCount: number; items: readonly unknown[] }, pageNumber: number, pageSize: number) {
  if (data.pageNumber !== pageNumber || data.pageSize > pageSize || data.items.length > data.pageSize || data.totalCount < data.items.length)
    throw new ApiError('Phân trang tồn kho không hợp lệ. Vui lòng tải lại.', 422);
}

export const inventoryApi = {
  getInventory: async (params: InventoryListQuery & { warehouseId: string }, signal?: AbortSignal) => {
    const data = scopedInventoryListSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/inventory', { params, signal })));
    validatePage(data, params.pageNumber, params.pageSize);
    if (data.items.some((stock) => !sameId(stock.warehouseId, params.warehouseId) || (params.productId && !sameId(stock.productId, params.productId)) || (params.slotId && !sameId(stock.slotId, params.slotId))))
      throw new ApiError('Dữ liệu tồn không khớp kho hoặc vị trí đang xem.', 403);
    return data;
  },
  getStockMovements: async (params: StockMovementListQuery & { warehouseId: string }, signal?: AbortSignal) => {
    const data = stockMovementListSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/inventory/movements', { params, signal })));
    validatePage(data, params.pageNumber, params.pageSize);
    if (data.items.some((movement) => (params.productId && !sameId(movement.productId, params.productId)) || (params.slotId && !sameId(movement.slotId, params.slotId))))
      throw new ApiError('Lịch sử không khớp sản phẩm hoặc vị trí đang xem.', 403);
    return data;
  },
  findStock: (warehouseId: string, stockId: string, productId: string, slotId: string, signal?: AbortSignal, cursor?: RecordSearchCursor) =>
    findPagedRecord(pageNumber => inventoryApi.getInventory({ warehouseId, productId, slotId, pageNumber, pageSize: 100 }, signal),
      item => sameId(item.id, stockId), cursor, signal),
};
