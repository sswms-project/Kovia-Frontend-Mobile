import type { BarcodeMatch, BarcodeResult, InventoryList } from './inventory-lookup.schema';

export function assertBarcodeScope(result: BarcodeResult, warehouseId: string, kind: 'Product' | 'Location') {
  if (result.matches.some((match) => match.warehouseId !== warehouseId ||
    (kind === 'Product' ? match.type !== 'Product' : match.type === 'Product')))
    throw new Error('Kết quả tra mã không thuộc phạm vi đang chọn. Vui lòng tải lại.');
  return result;
}

export function exactInventoryFilter(match: BarcodeMatch) {
  switch (match.type) {
    case 'Product': return { productId: match.id };
    case 'Zone': return { zoneId: match.id };
    case 'Rack': return { rackId: match.id };
    case 'Slot': return { slotId: match.id };
  }
}

export function assertInventoryScope(result: InventoryList, warehouseId: string, match: BarcodeMatch | null) {
  if (result.items.some((item) => item.warehouseId !== warehouseId ||
    match?.type === 'Product' && item.productId !== match.id ||
    match?.type === 'Rack' && item.rackId !== match.id ||
    match?.type === 'Slot' && item.slotId !== match.id))
    throw new Error('Dữ liệu tồn kho không thuộc phạm vi đang chọn. Vui lòng tải lại.');
  // The inventory contract has no zoneId; the backend owns that filter.
  return result;
}

export function createScanGate() {
  let armed = false;
  return { arm: () => { armed = true; }, close: () => { armed = false; },
    take: () => { if (!armed) return false; armed = false; return true; } };
}

export function inventoryTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa xác định' : date.toLocaleString('vi-VN');
}
