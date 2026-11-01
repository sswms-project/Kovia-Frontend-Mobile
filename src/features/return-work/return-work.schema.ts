import { z } from 'zod';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { executionStatusSchema } from '@/features/my-tasks/my-tasks.schema';

const id = nonEmptyDotNetGuidSchema('Mã trả hàng không hợp lệ.');
const text = z.string();
const nullableText = text.nullable();
export const conditionSchema = z.enum(['Good', 'Damaged', 'Expired', 'Scrap']);
export const returnWorkSchema = z.object({
  assignmentRequired: z.boolean(), sourceDocumentId: id, documentVersion: text.min(1), warehouseId: id,
  referenceCode: text, approved: z.boolean(), taskId: id.nullable(), taskVersion: nullableText,
  executionStatus: executionStatusSchema.nullable(), assignedTo: id.nullable(), priority: z.enum(['Normal', 'Urgent']).nullable(),
  dueAt: nullableText, startedAt: nullableText, canAssign: z.boolean(), canManage: z.boolean(), canComplete: z.boolean(),
  assignedToName: nullableText, warehouseName: text,
});
const eventSchema = z.object({ action: text, actorName: nullableText, createdAt: text, reason: nullableText });
export const customerReturnSchema = z.object({
  id, goodsReturnRequestCode: text, stockIssueRequestId: id, stockIssueRequestCode: text, reason: text, status: text,
  createdAt: text, createdBy: id, approvedBy: id.nullable(), approvedAt: nullableText, rejectionReason: nullableText,
  warehouseName: nullableText.optional(), recipientName: nullableText.optional(), createdByName: nullableText.optional(),
  approvedByName: nullableText.optional(), version: text.min(1), allowedActions: z.array(text).nullable().optional(),
  history: z.array(eventSchema).nullable().optional(),
  items: z.array(z.object({ id, stockIssuePickDetailId: id.nullable(), productId: id, productName: text, sku: text,
    quantity: z.number().finite().positive(), condition: conditionSchema, restockSlotId: id.nullable(), lotId: id.nullable(), lotNumber: nullableText,
    unitName: nullableText.optional(), restockLocation: nullableText.optional(), actualCondition: conditionSchema.nullable().optional() })),
});
export const supplierReturnSchema = z.object({
  id, code: text, supplierId: id, supplierName: text, warehouseId: id, warehouseName: text, status: text, reason: text,
  negotiationNote: nullableText, damageCaseId: id.nullable(), createdById: id, createdByName: text, createdAt: text,
  approvedAt: nullableText, approvedByName: nullableText, deliveredAt: nullableText, deliveredByName: nullableText,
  rejectionReason: nullableText, cancellationReason: nullableText, version: text.min(1),
  allowedActions: z.array(text).nullable().optional(), history: z.array(eventSchema).nullable().optional(),
  sourceGoodsReceiptId: id.nullable().optional(), sourceGoodsReceiptCode: nullableText.optional(),
  items: z.array(z.object({ id, inventoryStockId: id, productId: id, sku: text, productName: text, unit: text,
    slotId: id, slotCode: text, lotId: id.nullable(), lotNumber: nullableText, qualityStatus: text, eligibilityStatus: text,
    quantity: z.number().finite().positive(), deliveredQuantity: z.number().finite().nullable(),
    quantityPrecision: z.number().int().min(0).max(6).nullable().optional(), zoneCode: nullableText.optional(), rackCode: nullableText.optional(),
    isSystemDefaultSlot: z.boolean().optional(), availableQuantity: z.number().nullable().optional(),
    sourceRemainingQuantity: z.number().nullable().optional(), sourceLocation: nullableText.optional(),
    sourceScanCodes: z.array(text).nullable().optional(), productScanCodes: z.array(text).nullable().optional() })),
});
const slotOptionSchema = z.object({ slotId: id, slotCode: text, path: text, suggestedQuantity: z.number(),
  availableQuantity: z.number().nullable(), isOriginalSlot: z.boolean(), reason: text, warnings: z.array(text), scanCodes: z.array(text).nullable().optional() });
export const restockOptionsSchema = z.object({ version: text.min(1), items: z.array(z.object({ returnItemId: id,
  options: z.array(slotOptionSchema), conditionOptions: z.array(z.object({ condition: text, options: z.array(slotOptionSchema) })).nullable().optional() })) });
const scanCode = text.trim().max(100, 'Mã tối đa 100 ký tự.');
export const restockLineSchema = z.object({ returnItemId: id, condition: conditionSchema, restockSlotId: id.nullable(), scannedSlotCode: scanCode.nullable() })
  .superRefine((line, context) => {
    if (line.condition !== 'Scrap' && (!line.restockSlotId || !line.scannedSlotCode))
      context.addIssue({ code: 'custom', path: ['scannedSlotCode'], message: 'Chọn và quét đúng vị trí đã cất hàng.' });
    if (line.condition === 'Scrap' && (line.restockSlotId || line.scannedSlotCode))
      context.addIssue({ code: 'custom', path: ['restockSlotId'], message: 'Hàng không nhập lại kho không có vị trí cất.' });
  });
export const deliveryLineSchema = z.object({ itemId: id, deliveredQuantity: z.number({ error: 'Nhập số lượng thực giao.' }).finite().min(0, 'Số lượng không được âm.').max(Number.MAX_SAFE_INTEGER / 100),
  scannedSlotCode: scanCode.nullable(), scannedProductCode: scanCode.nullable() }).superRefine((line, context) => {
  if (line.deliveredQuantity > 0 && (!line.scannedSlotCode || !line.scannedProductCode))
    context.addIssue({ code: 'custom', path: ['scannedProductCode'], message: 'Quét vị trí nguồn và mã hàng trước khi giao.' });
});
export const returnFormSchema = z.object({ items: z.array(restockLineSchema), lines: z.array(deliveryLineSchema) });
const proof = { expectedVersion: text.min(1), taskId: id, taskVersion: text.min(1), commandId: id };
export const returnCommandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('Manage'), body: z.object({ taskId: id, documentVersion: text.min(1), taskVersion: text.min(1), commandId: id,
    action: z.enum(['Start', 'Pause', 'Return']), reason: text.trim().max(500).nullable() }).superRefine((body, context) => {
      if (body.action !== 'Start' && !body.reason) context.addIssue({ code: 'custom', path: ['reason'], message: 'Nhập lý do.' });
    }) }),
  z.object({ kind: z.literal('Customer'), body: z.object({ ...proof, items: z.array(restockLineSchema).min(1) }) }),
  z.object({ kind: z.literal('Supplier'), body: z.object({ ...proof, lines: z.array(deliveryLineSchema).min(1) }) }),
]);
export type ReturnWork = z.infer<typeof returnWorkSchema>;
export type CustomerReturn = z.infer<typeof customerReturnSchema>;
export type SupplierReturn = z.infer<typeof supplierReturnSchema>;
export type RestockOptions = z.infer<typeof restockOptionsSchema>;
export type ReturnSlot = z.infer<typeof slotOptionSchema>;
export type ReturnForm = z.infer<typeof returnFormSchema>;
export type ReturnCommand = z.infer<typeof returnCommandSchema>;
