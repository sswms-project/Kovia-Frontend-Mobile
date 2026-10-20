import type { AxiosRequestConfig } from 'axios';

import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { allocationDemandSchema, allocationOrderSchema, allocationPickersSchema, allocationPlanSchema,
  allocationQueueSchema, allocationSummarySchema, authorizeAllocationSchema, type AllocationAuthorization } from './smart-allocation.schema';

const id = nonEmptyDotNetGuidSchema('Mã dữ liệu không hợp lệ.');
export class AllocationScopeError extends Error {}
function guard(assertCurrentContext: () => void): AxiosRequestConfig & { assertCurrentContext: () => void } { return { assertCurrentContext }; }
export const smartAllocationApi = {
  queue: async (warehouseId: string, pageNumber: number, signal?: AbortSignal) => {
    id.parse(warehouseId);
    const result = allocationQueueSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/stock-issue-requests', {
      params: { warehouseId, status: 'Pending', pageNumber, pageSize: 20 }, signal,
    })));
    if (result.items.some(order => order.warehouseId !== warehouseId)) throw new AllocationScopeError('Phiếu không thuộc kho đang chọn.');
    return result;
  },
  context: async (orderId: string, warehouseId: string, signal?: AbortSignal) => {
    id.parse(orderId); id.parse(warehouseId);
    const order = allocationOrderSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/stock-issue-requests/${orderId}`, { signal })));
    if (order.id !== orderId || order.warehouseId !== warehouseId) throw new AllocationScopeError('Phiếu không thuộc kho đang chọn.');
    const [planResponse, demandResponse, pickersResponse] = await Promise.all([
      api.get<ApiResponse<unknown>>(`/stock-issue-requests/${orderId}/allocation-plan`, { signal }),
      api.get<ApiResponse<unknown>>(`/stock-issue-requests/${orderId}/cross-dock`, { signal }),
      api.get<ApiResponse<unknown>>(`/stock-issue-requests/${orderId}/cross-dock/pickers`, { signal }),
    ]);
    const plan = allocationPlanSchema.parse(unwrap(planResponse));
    const demand = allocationDemandSchema.nullable().parse(unwrap(demandResponse));
    if (plan.stockIssueRequestId !== orderId || demand && demand.stockIssueRequestId !== orderId)
      throw new AllocationScopeError('Kế hoạch không khớp phiếu đang mở.');
    return { order, plan, demand, pickers: allocationPickersSchema.parse(unwrap(pickersResponse)) };
  },
  summary: async (warehouseId: string, from: string, to: string, signal?: AbortSignal) => {
    id.parse(warehouseId);
    const result = allocationSummarySchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/warehouses/${warehouseId}/cross-dock-summary`, {
      params: { from, to }, signal,
    })));
    if (result.warehouseId !== warehouseId) throw new AllocationScopeError('Thống kê không thuộc kho đang chọn.');
    return result;
  },
  authorize: async (orderId: string, body: AllocationAuthorization, assertCurrentContext: () => void) => {
    id.parse(orderId); assertCurrentContext();
    return id.parse(unwrap(await api.post<ApiResponse<unknown>>(`/stock-issue-requests/${orderId}/cross-dock`,
      authorizeAllocationSchema.parse(body), guard(assertCurrentContext))));
  },
  revoke: async (orderId: string, demandId: string, expectedVersion: string, assertCurrentContext: () => void) => {
    id.parse(orderId); id.parse(demandId); assertCurrentContext();
    return unwrap(await api.post<ApiResponse<unknown>>(`/stock-issue-requests/${orderId}/cross-dock/${demandId}/revoke`,
      { stockIssueRequestId: orderId, demandId, expectedVersion }, guard(assertCurrentContext)));
  },
};
