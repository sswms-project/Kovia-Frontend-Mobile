import { P } from '@/config/permission-codes';
import type { UserProfile } from '@/features/auth/auth.types';
import type { CustomerReturn, RestockOptions, ReturnCommand, ReturnForm, ReturnSlot, ReturnWork, SupplierReturn } from './return-work.schema';

interface ReturnData { work: ReturnWork; document: CustomerReturn | SupplierReturn; options: RestockOptions | null }
export function confirmedReturnData(data: ReturnData, command: ReturnCommand): ReturnData {
  if (command.kind === 'Supplier' && 'code' in data.document) return { ...data,
    work: { ...data.work, executionStatus: 'Completed', canComplete: false, canManage: false },
    document: { ...data.document, status: 'Completed', items: data.document.items.map(item => ({ ...item,
      deliveredQuantity: command.body.lines.find(line => line.itemId === item.id)?.deliveredQuantity ?? item.deliveredQuantity })) } };
  if (command.kind === 'Customer' && 'goodsReturnRequestCode' in data.document) return { ...data,
    work: { ...data.work, executionStatus: 'Completed', canComplete: false, canManage: false },
    document: { ...data.document, status: 'Restocked', items: data.document.items.map(item => {
      const actual = command.body.items.find(line => line.returnItemId === item.id);
      if (!actual) return item;
      const slot = conditionSlots(data.options, item.id, actual.condition).find(slot => slot.slotId === actual.restockSlotId);
      return { ...item, actualCondition: actual.condition, restockSlotId: actual.restockSlotId,
        restockLocation: actual.condition === 'Scrap' ? null : slot?.path ?? null };
    }) } };
  return data;
}

export const RETURN_CONDITIONS = { Good: 'Hàng đạt', Damaged: 'Hàng hỏng', Expired: 'Hết hạn', Scrap: 'Không nhập lại kho' } as const;
export function hasReturnPermissions(supplier: boolean, profile: UserProfile | undefined) {
  return !!profile && [P.WAREHOUSE_TASKS_VIEW_OWN, P.WAREHOUSE_TASKS_MANAGE_OWN,
    supplier ? P.SUPPLIER_RETURNS_VIEW : P.GOODS_RETURN_REQUESTS_VIEW,
    supplier ? P.SUPPLIER_RETURNS_DISPATCH : P.GOODS_RETURN_REQUESTS_RESTOCK].every(permission => profile.permissions.includes(permission));
}
export function matchesReturnCode(raw: string, codes: readonly string[]) {
  const code = raw.trim().toLowerCase();
  return !!code && code.length <= 100 && code !== '__system_default__' && !/\p{Cc}/u.test(raw) && codes.some(value => value.trim().toLowerCase() === code);
}
export function matchesReturnSlot(raw: string, slot: ReturnSlot | undefined) {
  return !!slot && matchesReturnCode(raw, slot.scanCodes ?? [`KOVIA:LOC:SLOT:${slot.slotId}`, slot.slotCode]);
}
export function conditionSlots(options: RestockOptions | null, itemId: string, condition: string) {
  return options?.items.find(item => item.returnItemId === itemId)?.conditionOptions?.find(entry => entry.condition === condition)?.options ?? [];
}
export function assertReturnWork(work: ReturnWork, taskId: string, warehouseId: string, userId: string) {
  if (work.taskId?.toLowerCase() !== taskId.toLowerCase() || work.warehouseId.toLowerCase() !== warehouseId.toLowerCase() ||
    work.assignedTo?.toLowerCase() !== userId.toLowerCase()) throw new Error('Công việc không còn thuộc bạn hoặc kho đang chọn.');
  if (!work.assignmentRequired) throw new Error('Luồng phân công trả hàng chưa được bật trên máy chủ.');
  return work;
}
export function assertCustomerReturn(document: CustomerReturn, options: RestockOptions, values: ReturnForm) {
  if (options.version !== document.version || !document.items.length || values.items.length !== document.items.length ||
    new Set(values.items.map(item => item.returnItemId)).size !== document.items.length) throw new Error('Nội dung phiếu hoặc vị trí đã thay đổi. Tải lại trước khi xác nhận.');
  for (const line of document.items) {
    const actual = values.items.find(item => item.returnItemId === line.id);
    if (!actual) throw new Error('Thiếu dòng hàng cần nhận.');
    if (actual.condition === 'Scrap') {
      if (actual.restockSlotId || actual.scannedSlotCode) throw new Error('Hàng không nhập lại kho không được chọn vị trí.');
      continue;
    }
    const slot = conditionSlots(options, line.id, actual.condition).find(slot => slot.slotId === actual.restockSlotId);
    if (!matchesReturnSlot(actual.scannedSlotCode ?? '', slot)) throw new Error(`Quét đúng vị trí đã cất ${line.productName}.`);
  }
}
export function assertSupplierReturn(document: SupplierReturn, values: ReturnForm) {
  if (!document.items.length || values.lines.length !== document.items.length || new Set(values.lines.map(line => line.itemId)).size !== document.items.length)
    throw new Error('Phải nhập đúng tất cả dòng hàng của phiếu.');
  for (const line of document.items) {
    const actual = values.lines.find(item => item.itemId === line.id);
    const precision = Math.min(line.quantityPrecision ?? 2, 2);
    if (!actual || !Number.isFinite(actual.deliveredQuantity) || actual.deliveredQuantity < 0 || actual.deliveredQuantity > line.quantity ||
      Number(actual.deliveredQuantity.toFixed(precision)) !== actual.deliveredQuantity || Number(line.quantity.toFixed(precision)) !== line.quantity)
      throw new Error(`Số lượng giao ${line.productName} phải từ 0 đến ${line.quantity}, đúng độ chính xác đơn vị.`);
    if (actual.deliveredQuantity > 0 && (!matchesReturnCode(actual.scannedSlotCode ?? '', line.sourceScanCodes ?? []) ||
      !matchesReturnCode(actual.scannedProductCode ?? '', line.productScanCodes ?? [line.sku]))) throw new Error(`Quét đúng vị trí và mã hàng ${line.productName}.`);
  }
  if (!values.lines.some(line => line.deliveredQuantity > 0)) throw new Error('Cần giao ít nhất một dòng có số lượng lớn hơn 0.');
}
