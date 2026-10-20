import type { TransferPickForm, TransferPickSheet, TransferScope } from './transfer-picking.schema';

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
  // Composite location labels are validated by the server; do not reject a valid printed label locally.
}
export function transferPickingComplete(sheet: TransferPickSheet) {
  const active = sheet.lines.filter(line => line.plannedQuantity > 0 || line.pickedQuantity > 0);
  return active.some(line => line.plannedQuantity > 0) && active.every(line => line.status !== 'PendingManager' &&
    line.pickedQuantity === line.plannedQuantity && line.pendingReturnQuantity === 0);
}
