import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

const id = nonEmptyDotNetGuidSchema('Mã dữ liệu không hợp lệ.');
const text = z.string();
const nullableText = text.nullable();
const quantity = z.number().finite().nonnegative();
export { warehouseActionsSchema as executionActionsSchema } from '@/lib/warehouse-contract.schema';
const pickLocation = z.object({ inventoryStockId: id, slotId: id, slotCode: text, zoneCode: text, rackCode: text,
  lotId: id.nullable(), lotNumber: nullableText, expiryDate: nullableText, reservedQuantity: quantity,
  directFromReceiving: z.boolean().default(false), allocationReason: nullableText.optional(), isSystemDefaultSlot: z.boolean().default(false) });
const pickDetail = z.object({ id, inventoryStockId: id, slotId: id, slotCode: text, stagingSlotId: id,
  stagingSlotCode: text, lotId: id.nullable(), lotNumber: nullableText, qualityStatus: text, pickedQuantity: quantity,
  returnedQuantity: quantity, returnableQuantity: quantity, pickedByUserId: id, pickedByName: text, pickedAt: text, issuedAt: nullableText,
  zoneCode: nullableText.optional(), rackCode: nullableText.optional(), isSystemDefaultSlot: z.boolean().default(false),
  stagingZoneCode: nullableText.optional(), stagingRackCode: nullableText.optional(), isSystemDefaultStagingSlot: z.boolean().default(false) });
export const stockIssueItemSchema = z.object({ id, productId: id, productName: text, sku: text, quantity,
  pickedQuantity: quantity, returnedQuantity: quantity, returnableQuantity: quantity, note: nullableText,
  barcode: nullableText, enteredQuantity: quantity, enteredUnitId: id, enteredUnitName: text,
  conversionFactor: z.number().positive(), pickLocations: z.array(pickLocation), pickDetails: z.array(pickDetail) });
export const stockIssueSchema = z.object({ id, stockIssueRequestCode: text, stockRecipientId: id,
  stockRecipientName: text, recipientCode: text, warehouseId: id, warehouseName: text,
  purpose: nullableText, referenceCode: nullableText, issueDate: nullableText, note: nullableText,
  recipientName: text, recipientPhone: text, recipientEmail: nullableText, recipientAddress: text,
  status: text, createdAt: text, dispatchAuthorizedByUserId: id.nullable(), dispatchAuthorizedAt: nullableText,
  dispatchedAt: nullableText, cancelledAt: nullableText, cancelledByUserId: id.nullable(), cancelReason: nullableText,
  assignedStaffId: id.nullable(), assignedStaffName: nullableText, version: nullableText,
  items: z.array(stockIssueItemSchema), attachments: z.array(z.object({ id, fileName: text, contentType: text,
    sizeBytes: quantity, uploadedAt: text })) });
export const pickFormSchema = z.object({ stockIssueRequestItemId: id, inventoryStockId: id,
  pickedQuantity: z.number({ error: 'Vui lòng nhập số lượng thực tế lấy.' }).finite().positive('Số lượng lấy phải lớn hơn 0.'),
  scannedBarcode: text.trim().max(200, 'Mã sản phẩm tối đa 200 ký tự.'),
  scannedSlotCode: text.trim().min(1, 'Vui lòng quét hoặc nhập mã vị trí.').max(200, 'Mã vị trí tối đa 200 ký tự.'),
  destinationStagingSlotId: id.optional(), scannedStagingSlotCode: text.trim().max(200, 'Mã vị trí đích tối đa 200 ký tự.').optional() });
export const pickingDestinationSchema = z.object({ stockIssueRequestId: id, warehouseId: id, version: nullableText,
  inventoryStockId: id, slotId: id, slotCode: text, path: text });
const command = { expectedVersion: text.min(1, 'Thiếu phiên bản. Vui lòng tải lại.'), commandId: id };
export const reportPickIssueSchema = z.object({ stockIssueRequestItemId: id,
  reason: text.trim().min(1, 'Vui lòng mô tả sự cố.').max(500, 'Mô tả tối đa 500 ký tự.') });
export const pickingCommandSchema = z.object({ ...command, items: z.array(pickFormSchema).min(1).max(500) });
export const dispatchCommandSchema = z.object({ ...command, pickDetailIds: z.array(id).min(1).max(500)
  .refine(values => new Set(values).size === values.length, 'Chi tiết xuất bị trùng.').optional() });
export type StockIssue = z.infer<typeof stockIssueSchema>;
export type StockIssueItem = z.infer<typeof stockIssueItemSchema>;
export type PickForm = z.infer<typeof pickFormSchema>;
