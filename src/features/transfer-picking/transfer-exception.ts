import { matchesWarehouseLocation } from '@/features/scanner/warehouse-scan';
import type { TransferPickSheet } from './transfer-picking.schema';
import type { TransferAlternative, TransferExceptionForm } from './transfer-exception.schema';

export function assertTransferException(values: TransferExceptionForm, sheet: TransferPickSheet, alternatives: readonly TransferAlternative[]) {
  const line = sheet.lines.find(item => item.lineId === values.lineId);
  if (!line) throw new Error('Dòng hàng đã thay đổi. Vui lòng tải lại.');
  if (values.action === 'Return') {
    const pick = line.picks.find(item => item.id === values.pickDetailId);
    const remaining = pick ? pick.pickedQuantity - pick.returnedQuantity - pick.dispatchedQuantity : 0;
    if (!pick || values.quantity > remaining) throw new Error('Số lượng trả vượt phần đã lấy nhưng chưa xuất.');
    // API also verifies the stock's slot barcode; the displayed code/path can be checked locally.
    const source = line.suggestions.find(item => item.inventoryStockId === pick.inventoryStockId);
    if (source && !matchesWarehouseLocation(values.scannedSlotCode, source)) throw new Error('Mã vị trí trả không khớp vị trí gốc của lượt lấy.');
  } else {
    if (line.status === 'PendingManager' || line.remainingQuantity <= 0) throw new Error('Dòng này đã chuyển bước hoặc đang chờ quản lý.');
    if (values.action === 'Switch') {
      const source = line.suggestions.find(item => item.inventoryStockId === values.fromInventoryStockId);
      const target = alternatives.find(item => item.inventoryStockId === values.toInventoryStockId);
      if (!source || !target || values.quantity > line.remainingQuantity || values.quantity > source.reservedQuantity ||
        values.quantity > source.suggestedQuantity || values.quantity > target.availableQuantity)
        throw new Error('Số lượng đổi vượt phần còn giữ tại nguồn hoặc tồn khả dụng của vị trí mới.');
    }
  }
  if (values.action !== 'Escalate') {
    const scale = 10 ** line.baseQuantityPrecision;
    if (Math.abs(values.quantity * scale - Math.round(values.quantity * scale)) > 1e-7)
      throw new Error('Số lượng chưa đúng độ chính xác của đơn vị cơ sở.');
  }
}
