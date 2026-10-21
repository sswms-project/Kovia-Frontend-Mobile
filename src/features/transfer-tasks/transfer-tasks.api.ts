import { api, unwrap, type ApiResponse } from '@/lib/api';

import type {
  PickSheet,
  ReceivableSlot,
  ReceiptBody,
  ReceiveSheet,
  RecordPickBody,
} from './transfer-tasks.types';

const shipmentPath = (transferId: string, shipmentId: string) =>
  `/transfers/${transferId}/shipments/${shipmentId}`;

export const transferTasksApi = {
  getPickSheet: (transferId: string, shipmentId: string) =>
    api.get<ApiResponse<PickSheet>>(`${shipmentPath(transferId, shipmentId)}/pick-sheet`).then(unwrap),
  // Replaying the same commandId with the same body is safe; a different body is a 409.
  recordPick: (transferId: string, shipmentId: string, body: RecordPickBody) =>
    api.post(`${shipmentPath(transferId, shipmentId)}/picks`, body),
  completePicking: (transferId: string, shipmentId: string, expectedVersion: string) =>
    api.post(`${shipmentPath(transferId, shipmentId)}/complete-picking`, { expectedVersion }),
  getReceiveSheet: (transferId: string, shipmentId: string) =>
    api.get<ApiResponse<ReceiveSheet>>(`${shipmentPath(transferId, shipmentId)}/receive-sheet`).then(unwrap),
  /** Resolves a scanned shelf label; null means no such shelf in the destination warehouse. */
  lookupReceivableSlot: (warehouseId: string, code: string) =>
    api
      .get<ApiResponse<ReceivableSlot | null>>('/transfers/receivable-slot', { params: { warehouseId, code } })
      .then(unwrap),
  // One receipt per shipment, not idempotent: reload the sheet before retrying after a timeout.
  submitReceipt: (transferId: string, shipmentId: string, body: ReceiptBody) =>
    api.post(`${shipmentPath(transferId, shipmentId)}/receipt`, body),
};
