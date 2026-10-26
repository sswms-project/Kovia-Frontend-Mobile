import { ApiError, api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { transferMonitorDetailSchema, transferPageSchema } from './transfer-monitor.schema';
export const transferMonitorApi = {
  list: async (warehouseId: string, direction: 'source' | 'destination', searchTerm: string, status: string | null, pageNumber: number, pageSize: number) => {
    nonEmptyDotNetGuidSchema('Chọn kho để theo dõi.').parse(warehouseId);
    const data = transferPageSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/transfers', { params: {
      [direction === 'source' ? 'sourceWarehouseId' : 'destinationWarehouseId']: warehouseId,
      searchTerm: searchTerm || undefined, status: status ?? undefined, pageNumber, pageSize,
    } })));
    if (data.pageNumber !== pageNumber || data.pageSize !== pageSize || data.items.some(item =>
      (direction === 'source' ? item.sourceWarehouseId : item.destinationWarehouseId).toLowerCase() !== warehouseId.toLowerCase()))
      throw new ApiError('Danh sách điều chuyển không khớp kho đang theo dõi.', 403);
    return data;
  },
  get: async (id: string, warehouseId: string, signal?: AbortSignal) => {
    nonEmptyDotNetGuidSchema('Liên kết phiếu điều chuyển không hợp lệ.').parse(id);
    const data = transferMonitorDetailSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/transfers/${id}`, { signal })));
    if (data.id.toLowerCase() !== id.toLowerCase() || ![data.sourceWarehouseId, data.destinationWarehouseId].some(value => value.toLowerCase() === warehouseId.toLowerCase()))
      throw new ApiError('Phiếu không thuộc kho đang chọn hoặc bạn không có quyền truy cập.', 403);
    return data;
  },
};
