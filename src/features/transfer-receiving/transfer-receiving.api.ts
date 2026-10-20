import { api, unwrap, type ApiResponse } from '@/lib/api';
import type { AxiosRequestConfig } from 'axios';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { assertTransferDestinationScope } from './transfer-receiving';
import { transferDestinationScopeSchema, transferPutAwaySheetSchema, transferReceiptSheetSchema,
  type TransferReceivingMode } from './transfer-receiving.schema';
import { putAwayTransferSchema, startTransferReceivingSchema, submitTransferReceivingSchema,
  transferExecutionSlotsSchema, type TransferExecutionTarget } from './transfer-execution.schema';

const id = nonEmptyDotNetGuidSchema('Mã điều chuyển không hợp lệ.');
export const transferReceivingApi = {
  slots: async (warehouseId: string, search: string, signal?: AbortSignal) => {
    id.parse(warehouseId);
    return transferExecutionSlotsSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/transfers/putaway-slots', {
      params: { warehouseId, search: search.trim().slice(0, 100), top: 20 }, signal,
    })));
  },
  execute: async (transferId: string, shipmentId: string, target: TransferExecutionTarget, assertCurrentContext: () => void) => {
    id.parse(transferId); id.parse(shipmentId); assertCurrentContext();
    const config: AxiosRequestConfig & { assertCurrentContext: () => void } = { assertCurrentContext };
    const action = target.action === 'Start' ? 'start-receiving' : target.action === 'Submit' ? 'submit-receipt' : 'putaway';
    const body = target.action === 'Start' ? startTransferReceivingSchema.parse(target.body)
      : target.action === 'Submit' ? submitTransferReceivingSchema.parse(target.body) : putAwayTransferSchema.parse(target.body);
    return unwrap(await api.post<ApiResponse<unknown>>(`/transfers/${transferId}/shipments/${shipmentId}/${action}`, body, config));
  },
  load: async (transferId: string, shipmentId: string, warehouseId: string, userId: string,
    mode: TransferReceivingMode, signal?: AbortSignal) => {
    id.parse(transferId); id.parse(shipmentId);
    const path = `/transfers/${transferId}/shipments/${shipmentId}`;
    const [detailResponse, receiptResponse] = await Promise.all([
      api.get<ApiResponse<unknown>>(`/transfers/${transferId}`, { signal }),
      api.get<ApiResponse<unknown>>(`${path}/receipt-sheet`, { signal }),
    ]);
    const document = transferDestinationScopeSchema.parse(unwrap(detailResponse));
    const receipt = transferReceiptSheetSchema.parse(unwrap(receiptResponse));
    const shipment = assertTransferDestinationScope(document, receipt, transferId, shipmentId, warehouseId, userId, mode);
    if (mode !== 'PutAway' || ![1, 2].includes(receipt.receiptFlowVersion) || document.isLegacyWorkflow)
      return { document, receipt, shipment, putAway: null };
    const putAway = transferPutAwaySheetSchema.parse(unwrap(await api.get<ApiResponse<unknown>>(`${path}/putaway-sheet`, { signal })));
    assertTransferDestinationScope(document, putAway.receipt, transferId, shipmentId, warehouseId, userId, mode);
    return { document, receipt: putAway.receipt, shipment, putAway };
  },
};
