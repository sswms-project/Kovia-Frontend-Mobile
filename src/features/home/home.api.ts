import { z } from 'zod';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { ApiError, api, unwrap, type ApiResponse } from '@/lib/api';

export interface DashboardOverview {
  generatedAt: string;
  stockedSkuCount: number;
  reservedSkuCount: number;
  heldSkuCount: number;
  lowStockCount: number;
  pendingInboundRequests: number;
  pendingGoodsReceipts: number;
  pendingStockIssues: number;
  pendingTransfers: number;
  pendingCounts: number;
  overdueTasks: number;
  unassignedTasks: number;
  activeSlots: number;
  occupiedActiveSlots: number;
}

const count = z.number().int().nonnegative();
const overviewSchema = z.object({
  generatedAt: z.string(), warehouses: z.array(z.object({ id: nonEmptyDotNetGuidSchema('Mã kho không hợp lệ.'), name: z.string() })),
  stockedSkuCount: count, reservedSkuCount: count, heldSkuCount: count, lowStockCount: count,
  pendingInboundRequests: count, pendingGoodsReceipts: count, pendingStockIssues: count, pendingTransfers: count,
  pendingCounts: count, overdueTasks: count, unassignedTasks: count, activeSlots: count, occupiedActiveSlots: count,
});

export const homeApi = {
  overview: async (warehouseId: string, activityDays = 30, signal?: AbortSignal) => {
    nonEmptyDotNetGuidSchema('Chọn kho trước khi xem chỉ số.').parse(warehouseId);
    const data = overviewSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/dashboard/overview', {
      params: { 'warehouseIds[0]': warehouseId, activityDays, includeActivity: false }, signal,
    })));
    if (data.warehouses.some((warehouse) => warehouse.id.toLowerCase() !== warehouseId.toLowerCase()))
      throw new ApiError('Chỉ số không khớp kho đang chọn. Vui lòng tải lại.', 403);
    return data;
  },
};
