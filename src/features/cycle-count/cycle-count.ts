import type { CountForm, CountItem, CycleCount } from './cycle-count.schema';
import { matchesWarehouseLocation } from '@/features/scanner/warehouse-scan';
import { formatInventoryLocation } from '@/features/inventory/inventory.labels';

export function formatCountLocation(item: CountItem): string {
  const label = (name: string | null | undefined, code: string | null | undefined, prefix: RegExp) => {
    const title = name?.trim().replace(prefix, '').trim();
    return title ? `${title}${code && code !== title ? ` (${code})` : ''}` : code;
  };
  return formatInventoryLocation({ ...item,
    zoneCode: label(item.zoneName, item.zoneCode, /^khu\s+vực\s+/iu),
    rackCode: label(item.rackName, item.rackCode, /^kệ\s+/iu) });
}

export type CountScanKind = 'Product' | 'Location';
export function findCountLines(document: CycleCount, kind: CountScanKind, rawCode: string): readonly CountItem[] {
  const code = rawCode.trim().toLowerCase();
  if (!code || rawCode.trim().length > (kind === 'Product' ? 100 : 512) || /\p{Cc}/u.test(rawCode)) return [];
  return document.items.filter((item) => canRecordCountItem(document, item) && (kind === 'Product'
    ? code === item.productSku.trim().toLowerCase() || code === item.productBarcode?.trim().toLowerCase()
    : code !== '__system_default__' && matchesWarehouseLocation(rawCode, item)));
}

export function assertCountScope(document: CycleCount, warehouseId: string, userId: string) {
  if (document.warehouseId !== warehouseId || document.assignedTo !== userId)
    throw new Error('Phiếu kiểm kê không thuộc kho hoặc nhân viên đang được giao.');
  if (document.isBlindCount && ['Scheduled', 'Counting', 'Recount'].includes(document.status) && document.items.some(item =>
    item.systemQuantity !== null || item.difference !== null || item.countHistory.some(history => history.systemQuantity !== null)))
    throw new Error('Máy chủ chưa che đủ dữ liệu kiểm kê mù. Vui lòng cập nhật BE trước khi đếm.');
  return document;
}
export function canRecordCountItem(document: CycleCount, item: CountItem) {
  return ['Counting', 'Recount'].includes(document.status) && !!item.snapshotCapturedAt && item.countedQuantity === null &&
    (document.status !== 'Recount' || item.requestedRecountRound === document.recountRound);
}
export function assertCountRecord(document: CycleCount, item: CountItem, values: CountForm) {
  if (!canRecordCountItem(document, item)) throw new Error('Dòng chưa mở để đếm hoặc đã ghi nhận. Cần quản lý yêu cầu đếm lại để giữ lịch sử.');
  if (values.countMethod === 'Scanned' && values.scannedBarcode.trim().toLowerCase() !== item.productSku.trim().toLowerCase() &&
    values.scannedBarcode.trim().toLowerCase() !== item.productBarcode?.trim().toLowerCase())
    throw new Error('Mã sản phẩm không khớp với dòng kiểm kê.');
  if (values.countedDamagedQuantity > 0 && (item.damageEvidence?.length ?? 0) + values.damageEvidenceIds.length === 0)
    throw new Error('Vui lòng thêm ít nhất một ảnh bằng chứng hàng hỏng.');
}
