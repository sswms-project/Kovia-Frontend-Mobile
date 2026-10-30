import type { TransferPickForm, TransferPickLine, TransferPickSheet, TransferScope } from './transfer-picking.schema';
import { matchesWarehouseLocation } from '@/features/scanner/warehouse-scan';

export function nextTransferPick(lines: readonly TransferPickLine[]) {
  for (const line of lines) {
    if (line.remainingQuantity <= 0 || line.status === 'PendingManager') continue;
    const source = line.suggestions.find(value => value.suggestedQuantity > 0 && value.reservedQuantity > 0);
    if (source) return { line, source };
  }
  return null;
}

export function assertTransferPickScope(document: TransferScope, sheet: TransferPickSheet,
  transferId: string, shipmentId: string, warehouseId: string, userId: string) {
  const shipment = document.shipments?.find(value => value.id === shipmentId);
  if (document.id !== transferId || sheet.transferId !== transferId || sheet.shipmentId !== shipmentId ||
    document.sourceWarehouseId !== warehouseId || sheet.sourceWarehouseId !== warehouseId ||
    !shipment?.pickTaskId || shipment.pickAssigneeId !== userId)
    throw new Error('Đợt điều chuyển không thuộc kho hoặc công việc được giao cho bạn.');
  if (document.isLegacyWorkflow) throw new Error('Phiếu điều chuyển cũ chỉ được xử lý theo quy trình hiện có trên web.');
  if (shipment.version !== sheet.version || shipment.status !== sheet.shipmentStatus)
    throw new Error('Đợt điều chuyển vừa thay đổi. Vui lòng tải lại.');
  return shipment;
}
export function assertTransferPick(values: TransferPickForm, sheet: TransferPickSheet) {
  const line = sheet.lines.find(value => value.lineId === values.lineId);
  const source = line?.suggestions.find(value => value.inventoryStockId === values.inventoryStockId);
  if (!line || !source || line.status === 'PendingManager' || values.quantity > line.remainingQuantity ||
    values.quantity > source.reservedQuantity || values.quantity > source.suggestedQuantity)
    throw new Error('Số lượng lấy vượt phần còn lại hoặc phần được giữ tại vị trí này.');
  const code = values.scannedProductCode.trim().toLowerCase();
  if (![line.sku, line.productBarcode].some(value => value?.trim().toLowerCase() === code))
    throw new Error('Mã sản phẩm không khớp với dòng cần lấy.');
  if (!matchesWarehouseLocation(values.scannedSlotCode, source)) throw new Error('Mã vị trí không khớp với vị trí được giao lấy hàng.');
  const scale = 10 ** line.baseQuantityPrecision;
  if (Math.abs(values.quantity * scale - Math.round(values.quantity * scale)) > 1e-7)
    throw new Error('Số lượng chưa đúng độ chính xác của đơn vị cơ sở.');
}
export function transferPickingComplete(sheet: TransferPickSheet) {
  const active = sheet.lines.filter(line => line.plannedQuantity > 0 || line.pickedQuantity > 0);
  return active.some(line => line.plannedQuantity > 0) && active.every(line => line.status !== 'PendingManager' &&
    line.pickedQuantity === line.plannedQuantity && line.pendingReturnQuantity === 0);
}
