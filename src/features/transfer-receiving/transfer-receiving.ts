import type { TransferDestinationScope, TransferReceivingMode, TransferReceiptSheet } from './transfer-receiving.schema';
import type { TransferExecutionTarget } from './transfer-execution.schema';
import { P } from '@/config/permission-codes';

export function canContinueTransferPutaway(document: TransferDestinationScope, receipt: TransferReceiptSheet,
  userId: string | undefined, warehouseId: string | null, permissions: readonly string[]) {
  const shipment = document.shipments?.find(value => value.id === receipt.shipmentId);
  const execution = receipt.execution;
  return !!userId && document.id === receipt.transferId && !document.isLegacyWorkflow && document.status === 'InProgress' &&
    document.destinationWarehouseId === warehouseId && receipt.status === 'AwaitingPutAway' && !receipt.keptAtReceiving &&
    [1, 2].includes(receipt.receiptFlowVersion) && !!receipt.version && !!receipt.receiptSubmittedAt &&
    !!shipment?.putAwayTaskId && shipment.version === receipt.version && shipment.status === receipt.status &&
    ['Queued', 'InProgress'].includes(shipment.putAwayTaskStatus ?? '') &&
    (execution ? execution.destinationWarehouseId === warehouseId && execution.receiveAssigneeId === userId && execution.putAwayAssigneeId === userId
      : shipment.receiveAssigneeId === userId && shipment.putAwayAssigneeId === userId) &&
    shipment.receiveAssigneeId === userId && shipment.putAwayAssigneeId === userId &&
    permissions.includes(P.TRANSFERS_VIEW) && permissions.includes(P.TRANSFERS_RECEIVE);
}

export class TransferDestinationScopeError extends Error {}

export function transferReceiptActionAllowed(mode: TransferReceivingMode, action: TransferExecutionTarget['action'],
  status: string, taskStatus: string | null, canResume: boolean) {
  if (action === 'Resume') return mode === 'PutAway' && canResume;
  if (taskStatus !== 'Queued' && taskStatus !== 'InProgress') return false;
  return action === 'Start' ? mode === 'Receive' && status === 'InTransit'
    : action === 'Submit' ? mode === 'Receive' && status === 'Receiving'
      : mode === 'PutAway' && status === 'AwaitingPutAway';
}

export function assertTransferDestinationScope(document: TransferDestinationScope, receipt: TransferReceiptSheet,
  transferId: string, shipmentId: string, warehouseId: string, userId: string, mode: TransferReceivingMode) {
  const shipment = document.shipments?.find(value => value.id === shipmentId);
  const assigned = mode === 'Receive' ? shipment?.receiveAssigneeId : shipment?.putAwayAssigneeId;
  const task = mode === 'Receive' ? shipment?.receiveTaskId : shipment?.putAwayTaskId;
  if (!shipment || document.id !== transferId || receipt.transferId !== transferId || receipt.shipmentId !== shipmentId ||
    document.destinationWarehouseId !== warehouseId || !task || assigned !== userId)
    throw new TransferDestinationScopeError('Đợt điều chuyển không thuộc kho nhận hoặc công việc được giao cho bạn.');
  if (shipment?.version !== receipt.version || shipment?.status !== receipt.status)
    throw new Error('Đợt nhận hàng vừa thay đổi. Vui lòng tải lại.');
  return shipment;
}
const shipmentLabels: Record<string, string> = { Picking: 'Đang lấy hàng', ReadyToDispatch: 'Chờ xuất', InTransit: 'Đang vận chuyển',
  Receiving: 'Đang nhận và kiểm hàng', AwaitingPutAway: 'Đang chờ cất', Received: 'Đã hoàn tất nhận hàng',
  ReceivedWithDiscrepancy: 'Đã nhận, có chênh lệch', Cancelled: 'Đã hủy' };
export function transferReceivingStatus(status: string) { return shipmentLabels[status] ?? status; }
export function transferReceivingDate(value: string | null) {
  if (!value) return 'Chưa ghi nhận';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Không xác định thời điểm' : date.toLocaleString('vi-VN');
}
