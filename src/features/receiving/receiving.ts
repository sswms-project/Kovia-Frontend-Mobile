import { randomUUID } from 'expo-crypto';

import { P, type PermissionCode } from '@/config/permission-codes';
import type { UserProfile } from '@/features/auth/auth.types';
import type { TaskScope } from '@/features/my-tasks/my-tasks';
import { warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';

import type { PutAwayForm, Receipt, ReceiptForm, ReceivingTask } from './receiving.schema';

export interface ReceiptCommandMemory { content: string; commandId: string }
export function receiptCommand(previous: ReceiptCommandMemory | null, payload: unknown): ReceiptCommandMemory {
  const content = JSON.stringify(payload);
  return previous?.content === content ? previous : { content, commandId: randomUUID() };
}
export function assertReceivingContext(scope: TaskScope, profile: UserProfile | undefined, signedIn: boolean, permission: PermissionCode) {
  const snapshot = profile ? warehouseSnapshot(profile) : null;
  if (!signedIn || !snapshot?.activeUser || !snapshot.compatible || snapshot.identity !== scope.identity ||
    snapshot.signature !== scope.signature || !snapshot.warehouses.some(warehouse => warehouse.id === scope.warehouseId) ||
    !profile?.permissions.includes(P.GOODS_RECEIPTS_VIEW) || !profile.permissions.includes(permission))
    throw new Error('Kho, tài khoản hoặc quyền đã thay đổi. Vui lòng tải lại.');
}
export function assertReceivingTask(task: ReceivingTask, warehouseId: string, userId: string, inboundId: string) {
  if (task.warehouseId !== warehouseId || task.inboundRequestId !== inboundId || task.assignedTo !== userId)
    throw new Error('Không tìm thấy công việc nhận hàng trong phạm vi được giao.');
  return task;
}
export function assertReceiptScope(receipt: Receipt, warehouseId: string, userId: string, mode: 'receiving' | 'putaway', inboundId?: string) {
  if (receipt.warehouseId !== warehouseId || (inboundId && receipt.inboundRequestId !== inboundId) ||
    (mode === 'putaway' ? receipt.putAwayAssignedTo : receipt.receivingAssignedTo) !== userId)
    throw new Error('Phiếu nhận không thuộc kho hoặc công việc được giao cho bạn.');
  return receipt;
}
function precisionMatches(value: number, precision: number) {
  const scaled = value * 10 ** precision;
  return Number.isSafeInteger(Math.round(scaled)) && Math.abs(scaled - Math.round(scaled)) < 1e-7;
}
export function assertReceiptQuantities(values: ReceiptForm, task: ReceivingTask) {
  for (const line of values.lines) {
    const original = task.lines.find(candidate => candidate.inboundRequestItemId === line.inboundRequestItemId);
    if (!original) throw new Error('Dòng hàng không thuộc yêu cầu nhận.');
    const base = line.enteredUnitId === original.baseUnitId;
    if (!base && line.enteredUnitId !== original.enteredUnitId) throw new Error('Đơn vị nhận không hợp lệ.');
    const factor = base ? 1 : original.conversionFactorSnapshot;
    const precision = base ? original.baseUnitQuantityPrecision : original.enteredUnitQuantityPrecision;
    if (!precisionMatches(line.receivedQty, precision) || !precisionMatches(line.damagedQty, precision) ||
      !precisionMatches(line.rejectedQty, precision) || !precisionMatches(line.rejectedQty * factor, original.baseUnitQuantityPrecision) || !precisionMatches(line.rejectedQty * factor, 2) ||
      !precisionMatches(line.receivedQty * factor, original.baseUnitQuantityPrecision) ||
      !precisionMatches(line.damagedQty * factor, original.baseUnitQuantityPrecision) ||
      !precisionMatches(line.receivedQty * factor, 2) || !precisionMatches(line.damagedQty * factor, 2))
      throw new Error('Đơn vị hoặc quy đổi đóng gói chưa hợp lệ. Vui lòng kiểm tra số lượng theo đơn vị cơ sở.');
    if (line.receivedQty * factor > original.remainingQuantity) throw new Error('Số lượng nhận vượt phần còn được nhận. Vui lòng tải lại yêu cầu.');
    if (original.isLotTracked && !line.lotNumber) throw new Error(`Vui lòng nhập số lô cho ${original.productSKU}.`);
  }
}
export function assertReceiptCorrection(values: ReceiptForm, receipt: Receipt) {
  if (values.receiptCode !== receipt.receiptCode || values.lines.length !== receipt.items.length)
    throw new Error('Không được đổi chứng từ hoặc dòng hàng đã thực nhận.');
  for (const line of values.lines) {
    const original = receipt.items.find(item => item.inboundRequestItemId === line.inboundRequestItemId);
    const precision = original?.allowedUnits.find(unit => unit.unitId === original.baseUnitId)?.quantityPrecision;
    if (!original || precision === undefined || line.enteredUnitId !== original.baseUnitId || line.receivedQty !== original.receivedQuantity || line.rejectedQty !== original.rejectedQuantity ||
      line.lotNumber !== (original.lotNumber ?? '') || line.manufacturedDate !== (original.manufacturedDate ?? '') || line.expiryDate !== (original.expiryDate ?? ''))
      throw new Error('Không được thay số hàng, đơn vị hoặc lô đã thực nhận bằng thao tác sửa phân loại.');
    if (!precisionMatches(line.damagedQty, precision) || !precisionMatches(line.damagedQty, 2))
      throw new Error('Số lượng phân loại chưa hợp lệ theo đơn vị cơ sở.');
  }
}
export function assertPlacement(values: PutAwayForm, receipt: Receipt) {
  const item = receipt.items.find(value => value.id === values.goodsReceiptItemId);
  const precision = item?.allowedUnits.find(value => value.unitId === item.baseUnitId)?.quantityPrecision;
  if (!item || precision === undefined || values.quantity > item.remainingPutAwayQuantity || !precisionMatches(values.quantity, precision) || !precisionMatches(values.quantity, 2))
    throw new Error('Số lượng cất vượt phần còn lại hoặc chưa hợp lệ theo đơn vị cơ sở.');
  if (!receipt.receivingSlotId || !receipt.arrivalStockPostedAt || receipt.status !== 'Approved' ||
    receipt.putAwayTaskExecutionStatus === 'Cancelled' || receipt.putAwayTaskRequiresReconciliation)
    throw new Error('Phiếu chưa đủ điều kiện cất hàng hoặc cần quản lý đối soát tồn thực nhận.');
  if (values.slotId === receipt.receivingSlotId) throw new Error('Vị trí cất phải khác vị trí nhận hàng.');
}
const RECEIPT_STATES: Readonly<Record<string, string>> = {
  Draft: 'Nháp', PendingApproval: 'Chờ duyệt', InspectionCorrectionRequired: 'Cần sửa kiểm hàng', Approved: 'Đã duyệt',
  Completed: 'Hoàn tất', Queued: 'Chờ bắt đầu', InProgress: 'Đang làm', Paused: 'Tạm dừng', Cancelled: 'Đã hủy',
};
export function receiptHistoryTransition(from: string | null, to: string | null) {
  const before = from ? RECEIPT_STATES[from] : undefined;
  const after = to ? RECEIPT_STATES[to] : undefined;
  return before && after ? `${before} → ${after}` : after ?? before ?? '';
}
export function receiptToForm(receipt: Receipt): ReceiptForm {
  return { receiptCode: receipt.receiptCode, lines: receipt.items.flatMap(item => item.inboundRequestItemId ? [{
    inboundRequestItemId: item.inboundRequestItemId, enteredUnitId: item.baseUnitId, receivedQty: item.receivedQuantity,
    damagedQty: item.damagedQuantity, exceptionReason: item.exceptionReason ?? '', lotNumber: item.lotNumber ?? '',
    rejectedQty: item.rejectedQuantity,
    manufacturedDate: item.manufacturedDate ?? '', expiryDate: item.expiryDate ?? '',
  }] : []) };
}
