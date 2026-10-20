import { api, unwrap, type ApiResponse } from '@/lib/api';

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

export const homeApi = {
  overview: (activityDays = 30, signal?: AbortSignal) =>
    api
      .get<ApiResponse<DashboardOverview>>('/dashboard/overview', { params: { activityDays }, signal })
      .then(unwrap),
};
