import type { PickForm, StockIssue } from './stock-issue.schema';
import { codesMatch, matchesWarehouseLocation } from '@/features/scanner/warehouse-scan';
import { formatInventoryLocation } from '@/features/inventory/inventory.labels';

export function formatStockIssueStagingLocation(detail: StockIssue['items'][number]['pickDetails'][number]) {
  return formatInventoryLocation({ slotCode: detail.stagingSlotCode, zoneCode: detail.stagingZoneCode,
    rackCode: detail.stagingRackCode, isSystemDefaultSlot: detail.isSystemDefaultStagingSlot });
}

export function stockIssuePickQueue(items: StockIssue['items']) {
  return items.filter(item => item.pickedQuantity < item.quantity)
    .flatMap(item => item.pickLocations.filter(location => location.reservedQuantity > 0).map(location => ({ item, location })))
    .sort((left, right) => `${left.location.zoneCode}/${left.location.rackCode}/${left.location.slotCode}/${left.item.sku}`
      .localeCompare(`${right.location.zoneCode}/${right.location.rackCode}/${right.location.slotCode}/${right.item.sku}`, 'vi', { numeric: true }));
}

export function canCaptureIssueLocation(code: string, location: StockIssue['items'][number]['pickLocations'][number]) {
  const value = code.trim();
  if (!value || value.length > 200) return false;
  if (value.toLowerCase().startsWith('kovia:loc:slot:')) return matchesWarehouseLocation(value, location);
  // This DTO omits rack ID and custom slot barcode. Leave their final check to TransferScanRules in the command handler.
  if (value.toLowerCase().startsWith('kovia:loc:rack:')) return (location.isSystemDefaultSlot || location.slotCode === '__SYSTEM_DEFAULT__') &&
    /^kovia:loc:rack:[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
  return !value.toLowerCase().startsWith('kovia:loc:');
}

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
  if (!item.barcode && !codesMatch(values.scannedBarcode, item.sku)) throw new Error('Mã SKU không khớp với dòng hàng cần lấy.');
  if (!canCaptureIssueLocation(values.scannedSlotCode, location)) throw new Error('Mã vị trí không khớp với nguồn hàng được giữ cho phiếu.');
}
export function outstandingPicks(document: StockIssue) {
  return document.items.flatMap(item => item.pickDetails.filter(detail => !detail.issuedAt)
    .map(detail => ({ ...detail, productName: item.productName, sku: item.sku })));
}
