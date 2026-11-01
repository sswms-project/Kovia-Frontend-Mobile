import { api, unwrap, type ApiResponse } from '@/lib/api';
import type { AxiosRequestConfig } from 'axios';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { customerReturnSchema, restockOptionsSchema, returnCommandSchema, returnWorkSchema, supplierReturnSchema, type ReturnCommand } from './return-work.schema';

const idSchema = nonEmptyDotNetGuidSchema('Mã công việc trả hàng không hợp lệ.');
export const returnWorkApi = {
  documentTask: async (supplier: boolean, documentId: string, signal?: AbortSignal) =>
    returnWorkSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/return-work/${supplier}/documents/${idSchema.parse(documentId)}`, { signal }))),
  mine: async (supplier: boolean, taskId: string, signal?: AbortSignal) =>
    returnWorkSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/return-work/${supplier}/tasks/${idSchema.parse(taskId)}`, { signal }))),
  customer: async (id: string, signal?: AbortSignal) =>
    customerReturnSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/goods-return-requests/${idSchema.parse(id)}`, { signal }))),
  supplier: async (id: string, signal?: AbortSignal) =>
    supplierReturnSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/supplier-returns/${idSchema.parse(id)}`, { signal }))),
  options: async (id: string, signal?: AbortSignal) =>
    restockOptionsSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`/goods-return-requests/${idSchema.parse(id)}/restock-options`, { signal }))),
  send: async (supplier: boolean, documentId: string, command: ReturnCommand, assertCurrentContext: () => void) => {
    idSchema.parse(documentId); const request = returnCommandSchema.parse(command); assertCurrentContext();
    if ((request.kind === 'Customer' && supplier) || (request.kind === 'Supplier' && !supplier)) throw new Error('Loại phiếu trả hàng không khớp.');
    const path = request.kind === 'Manage' ? `/return-work/${supplier}/documents/${documentId}/actions`
      : request.kind === 'Customer' ? `/goods-return-requests/${documentId}/restock` : `/supplier-returns/${documentId}/deliver`;
    // The BE journals the original body. A retry sends it unchanged, including both versions.
    const config: AxiosRequestConfig & { assertCurrentContext: () => void } = { assertCurrentContext };
    const result = unwrap(await api.post<ApiResponse<unknown>>(path, request.body, config));
    assertCurrentContext(); return result;
  },
};
