import type { PickForm, StockIssue } from './stock-issue.schema';

export function assertStockIssueScope(document: StockIssue, warehouseId: string, userId: string) {
  if (document.warehouseId !== warehouseId || document.assignedStaffId !== userId)
    throw new Error('Phiếu xuất không thuộc kho hoặc công việc được giao cho bạn.');
  return document;
}
export function assertPick(values: PickForm, document: StockIssue) {
  const item = document.items.find(candidate => candidate.id === values.stockIssueRequestItemId);
  const location = item?.pickLocations.find(candidate => candidate.inventoryStockId === values.inventoryStockId);
  if (!item || !location || values.pickedQuantity > item.quantity - item.pickedQuantity || values.pickedQuantity > location.reservedQuantity)
    throw new Error('Số lượng lấy vượt phần còn lại hoặc phần được giữ tại vị trí này.');
  // The current BE uses decimal(18,2); never silently round a physical quantity.
  if (!Number.isSafeInteger(Math.round(values.pickedQuantity * 100)) ||
    Math.abs(values.pickedQuantity * 100 - Math.round(values.pickedQuantity * 100)) > 1e-7)
    throw new Error('Số lượng chỉ hỗ trợ tối đa hai chữ số thập phân.');
  if (item.conversionFactor !== 1 && Math.abs(values.pickedQuantity / item.conversionFactor - Math.round(values.pickedQuantity / item.conversionFactor)) > 1e-7)
    throw new Error('Số lượng lấy phải theo nguyên kiện của dòng hàng.');
  if (item.barcode && values.scannedBarcode.trim().toLowerCase() !== item.barcode.trim().toLowerCase())
    throw new Error('Mã sản phẩm không khớp với dòng hàng cần lấy.');
}
export function outstandingPicks(document: StockIssue) {
  return document.items.flatMap(item => item.pickDetails.filter(detail => !detail.issuedAt)
    .map(detail => ({ ...detail, productName: item.productName, sku: item.sku })));
}
