import { ApiError, api, unwrap, type ApiResponse } from '@/lib/api';

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
  findStock: async (warehouseId: string, stockId: string, productId: string, slotId: string, signal?: AbortSignal) => {
    for (let pageNumber = 1; pageNumber <= 20; pageNumber += 1) {
      const page = await inventoryApi.getInventory({ warehouseId, productId, slotId, pageNumber, pageSize: 100 }, signal);
      const stock = page.items.find((item) => sameId(item.id, stockId));
      if (stock) return stock;
      if (page.pageNumber * page.pageSize >= page.totalCount) return null;
      if (!page.items.length) throw new ApiError('Dữ liệu tồn đã thay đổi. Vui lòng tải lại.', 409);
    }
    throw new ApiError('Chưa tải đủ dữ liệu để xác định dòng tồn. Vui lòng thu hẹp tra cứu hoặc mở trên web.', 422);
  },
};
