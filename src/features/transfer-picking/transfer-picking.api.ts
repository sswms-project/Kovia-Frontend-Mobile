import type { z } from 'zod';
import type { AxiosRequestConfig } from 'axios';

import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { assertTransferPickScope } from './transfer-picking';
import { transferCompleteCommandSchema, transferPickCommandSchema, transferPickSheetSchema, transferScopeSchema } from './transfer-picking.schema';
import { z as schema } from 'zod';
import { transferAlternativeSchema, switchTransferCommandSchema, escalateTransferCommandSchema, returnTransferCommandSchema } from './transfer-exception.schema';

const id = nonEmptyDotNetGuidSchema('Mã điều chuyển không hợp lệ.');
function guarded(assertCurrentContext: () => void): AxiosRequestConfig & { assertCurrentContext: () => void } { return { assertCurrentContext }; }
export const transferPickingApi = {
  alternatives: async (transferId: string, shipmentId: string, lineId: string, signal?: AbortSignal) => {
    [transferId, shipmentId, lineId].forEach(value => id.parse(value));
    return schema.array(transferAlternativeSchema).parse(unwrap(await api.get<ApiResponse<unknown>>(
      `/transfers/${transferId}/shipments/${shipmentId}/lines/${lineId}/alternatives`, { signal })));
  },
  switch: async (body: z.infer<typeof switchTransferCommandSchema>, assertCurrentContext: () => void) => {
    const values = switchTransferCommandSchema.parse(body); assertCurrentContext();
    return api.post<ApiResponse<unknown>>(`/transfers/${values.transferId}/shipments/${values.shipmentId}/lines/${values.lineId}/switch`,
      values, guarded(assertCurrentContext)).then(unwrap);
  },
  escalate: async (body: z.infer<typeof escalateTransferCommandSchema>, assertCurrentContext: () => void) => {
    const values = escalateTransferCommandSchema.parse(body); assertCurrentContext();
    return api.post<ApiResponse<unknown>>(`/transfers/${values.transferId}/shipments/${values.shipmentId}/lines/${values.lineId}/escalate`,
      values, guarded(assertCurrentContext)).then(unwrap);
  },
  returnPick: async (body: z.infer<typeof returnTransferCommandSchema>, assertCurrentContext: () => void) => {
    const values = returnTransferCommandSchema.parse(body); assertCurrentContext();
    return api.post<ApiResponse<unknown>>(`/transfers/${values.transferId}/shipments/${values.shipmentId}/returns`,
      values, guarded(assertCurrentContext)).then(unwrap);
  },
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
  complete: async (body: z.infer<typeof transferCompleteCommandSchema>, assertCurrentContext: () => void) => {
    const values = transferCompleteCommandSchema.parse(body); assertCurrentContext();
    const result = unwrap(await api.post<ApiResponse<unknown>>(
      `/transfers/${values.transferId}/shipments/${values.shipmentId}/complete-picking`, values, guarded(assertCurrentContext)));
    assertCurrentContext(); return result;
  },
};
