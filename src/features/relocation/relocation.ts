import type { RelocationForm, RelocationLine, RelocationRecommendations, RelocationSource, RelocationTask } from './relocation.schema';
import { ApiError } from '@/lib/api';

export const sameRelocationId = (left: string | null | undefined, right: string | null | undefined) =>
  !!left && !!right && left.toLowerCase() === right.toLowerCase();

export function assertRelocationScope(task: RelocationTask, taskId: string, warehouseId: string, userId: string) {
  if (!sameRelocationId(task.id, taskId) || !sameRelocationId(task.warehouseId, warehouseId) || !sameRelocationId(task.assignedTo, userId))
    throw new ApiError('Công việc không còn thuộc kho hoặc phân công của bạn. Vui lòng tải lại.', 403);
  return task;
}
export function relocationDestinations(line: RelocationLine, recommendations: RelocationRecommendations, canAssign: boolean) {
  const proposed = line.proposedDestinationSlotId && line.proposedDestinationSlotCode
    ? [{ id: line.proposedDestinationSlotId, code: line.proposedDestinationSlotCode, title: `${line.proposedDestinationSlotCode} · Đích được giao`, reasons: ['Vị trí đã được phân công cho dòng công việc.'] }] : [];
  const ranked = recommendations.filter(row => !sameRelocationId(row.slotId, line.proposedDestinationSlotId))
    .map(row => ({ id: row.slotId, code: row.slotCode, title: `${row.zoneCode} / ${row.rackCode} / ${row.slotCode} · Hạng ${row.rank}`, reasons: row.reasons }));
  return canAssign ? [...proposed, ...ranked] : proposed.length ? proposed : ranked.slice(0, 1);
}
export function matchesRelocationSlot(code: string, slotId: string, slotCode: string) {
  const scanned = code.trim().toLowerCase();
  return scanned === slotCode.trim().toLowerCase() || scanned === `kovia:loc:slot:${slotId.toLowerCase()}`;
}
export function assertRelocation(values: RelocationForm, task: RelocationTask, line: RelocationLine,
  source: RelocationSource, recommendations: RelocationRecommendations, canAssign: boolean) {
  const { stock, product, unit } = source;
  if (!sameRelocationId(values.lineId, line.id) || !task.lines.some(row => sameRelocationId(row.id, line.id)) ||
    !sameRelocationId(stock.id, line.sourceInventoryStockId) || !sameRelocationId(stock.productId, line.productId) ||
    !sameRelocationId(stock.slotId, line.sourceSlotId) || !sameRelocationId(stock.warehouseId, task.warehouseId) ||
    !sameRelocationId(product.id, line.productId) || !sameRelocationId(unit.id, product.unitId))
    throw new Error('Nguồn tồn hoặc đơn vị không khớp công việc. Vui lòng tải lại.');
  if (stock.qualityStatus !== 'Good' || stock.eligibilityStatus !== 'Available' || stock.availableQuantity < values.quantity ||
    values.quantity > line.remainingQuantity) throw new Error('Số lượng vượt phần còn lại hoặc tồn khả dụng của nguồn được giao.');
  if (product.isLotTracked && (!stock.lotId || !stock.lotNumber)) throw new Error('Chưa xác định được lô nguồn. Vui lòng liên hệ quản lý.');
  const scaled = values.quantity * 10 ** Math.min(2, unit.quantityPrecision);
  if (!Number.isSafeInteger(Math.round(scaled)) || Math.abs(scaled - Math.round(scaled)) > 1e-7)
    throw new Error(`Số lượng ${unit.unitName} chỉ hỗ trợ tối đa ${Math.min(2, unit.quantityPrecision)} chữ số thập phân.`);
  const destination = relocationDestinations(line, recommendations, canAssign).find(row => sameRelocationId(row.id, values.destinationSlotId));
  if (!destination || sameRelocationId(destination.id, line.sourceSlotId)) throw new Error('Hãy chọn vị trí đích được phép cho công việc.');
  if (!matchesRelocationSlot(values.sourceScan, line.sourceSlotId, line.sourceSlotCode) ||
    !matchesRelocationSlot(values.destinationScan, destination.id, destination.code)) throw new Error('Mã vị trí nguồn hoặc đích chưa khớp.');
  if (![product.sku, product.barcodeValue].some(code => code?.trim().toLowerCase() === values.productScan.trim().toLowerCase()))
    throw new Error('Mã sản phẩm chưa khớp dòng công việc.');
  if (!sameRelocationId(destination.id, line.proposedDestinationSlotId) &&
    !recommendations.some(row => sameRelocationId(row.slotId, destination.id) && row.rank === 1) && !values.overrideReason.trim())
    throw new Error('Vui lòng nhập lý do khi chọn vị trí khác gợi ý ưu tiên.');
  return destination;
}
