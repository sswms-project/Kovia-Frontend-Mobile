import type { z } from 'zod';
import type { AxiosRequestConfig } from 'axios';

import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { assertTransferPickScope } from './transfer-picking';
import { transferCompleteCommandSchema, transferEscalateCommandSchema, transferPickAlternativesSchema, transferPickCommandSchema,
  transferPickSheetSchema, transferReturnCommandSchema, transferScopeSchema, transferSwitchCommandSchema } from './transfer-picking.schema';

const id = nonEmptyDotNetGuidSchema('Mã điều chuyển không hợp lệ.');
function guarded(assertCurrentContext: () => void): AxiosRequestConfig & { assertCurrentContext: () => void } { return { assertCurrentContext }; }
export const transferPickingApi = {
  load: async (transferId: string, shipmentId: string, warehouseId: string, userId: string, signal?: AbortSignal) => {
    id.parse(transferId); id.parse(shipmentId);
    const [detail, pickSheet] = await Promise.all([
      api.get<ApiResponse<unknown>>(`/transfers/${transferId}`, { signal }),
      api.get<ApiResponse<unknown>>(`/transfers/${transferId}/shipments/${shipmentId}/pick-sheet`, { signal }),
    ]);
    const document = transferScopeSchema.parse(unwrap(detail));
    const sheet = transferPickSheetSchema.parse(unwrap(pickSheet));
    const shipment = assertTransferPickScope(document, sheet, transferId, shipmentId, warehouseId, userId);
    return { document, shipment, sheet };
  },
  pick: async (body: z.infer<typeof transferPickCommandSchema>, assertCurrentContext: () => void) => {
    const values = transferPickCommandSchema.parse(body); assertCurrentContext();
    const result = unwrap(await api.post<ApiResponse<unknown>>(
      `/transfers/${values.transferId}/shipments/${values.shipmentId}/picks`, values, guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
  alternatives: async (transferId: string, shipmentId: string, lineId: string, signal?: AbortSignal) => {
    id.parse(transferId); id.parse(shipmentId); id.parse(lineId);
    return transferPickAlternativesSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(
      `/transfers/${transferId}/shipments/${shipmentId}/lines/${lineId}/alternatives`, { signal })));
  },
  switchPick: async (body: z.infer<typeof transferSwitchCommandSchema>, assertCurrentContext: () => void) => {
    const { transferId, shipmentId, lineId, ...values } = transferSwitchCommandSchema.parse(body); assertCurrentContext();
    const result = unwrap(await api.post<ApiResponse<unknown>>(
      `/transfers/${transferId}/shipments/${shipmentId}/lines/${lineId}/switch`, values, guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
  escalate: async (body: z.infer<typeof transferEscalateCommandSchema>, assertCurrentContext: () => void) => {
    const { transferId, shipmentId, lineId, ...values } = transferEscalateCommandSchema.parse(body); assertCurrentContext();
    const result = unwrap(await api.post<ApiResponse<unknown>>(
      `/transfers/${transferId}/shipments/${shipmentId}/lines/${lineId}/escalate`, values, guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
  returnPick: async (body: z.infer<typeof transferReturnCommandSchema>, assertCurrentContext: () => void) => {
    const { transferId, shipmentId, ...values } = transferReturnCommandSchema.parse(body); assertCurrentContext();
    const result = unwrap(await api.post<ApiResponse<unknown>>(
      `/transfers/${transferId}/shipments/${shipmentId}/returns`, values, guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
  complete: async (body: z.infer<typeof transferCompleteCommandSchema>, assertCurrentContext: () => void) => {
    const values = transferCompleteCommandSchema.parse(body); assertCurrentContext();
    const result = unwrap(await api.post<ApiResponse<unknown>>(
      `/transfers/${values.transferId}/shipments/${values.shipmentId}/complete-picking`, values, guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
};
