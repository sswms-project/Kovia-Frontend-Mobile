import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { warehouseActionsSchema, warehouseEvidenceSchema as evidenceSchema } from '@/lib/warehouse-contract.schema';

const id = nonEmptyDotNetGuidSchema('Mã dữ liệu không hợp lệ.');
const text = z.string();
const nullableText = text.nullable();
const quantity = z.number().finite().min(0);
const version = text.min(1, 'Thiếu phiên bản. Vui lòng tải lại dữ liệu.');
export const locationSearchSchema = z.object({ searchTerm: text.trim().max(100, 'Từ khóa tối đa 100 ký tự.') });
export const receivingLocationSchema = z.object({ id, zoneCode: text, rackCode: text, slotCode: text, displayPath: text });
export const receivingLocationsSchema = z.object({ items: z.array(receivingLocationSchema), totalCount: quantity.int() });
export const receivingTaskLineSchema = z.object({
  inboundRequestItemId: id, productId: id, productSKU: text, productName: text, barcodeValue: nullableText,
  isLotTracked: z.boolean(), orderedQuantity: quantity, receivedQuantity: quantity, remainingQuantity: quantity,
  baseUnitId: id, baseUnitName: text, enteredUnitId: id, enteredUnitName: text, conversionFactorSnapshot: z.number().positive(),
  baseUnitQuantityPrecision: quantity.int().max(6), enteredUnitQuantityPrecision: quantity.int().max(6),
});
export const receivingTaskSchema = z.object({
  version, warehouseCode: nullableText, supplierCode: nullableText, inboundRequestId: id, inboundRequestCode: text,
  warehouseId: id, warehouseName: text, supplierId: id.nullable(), supplierName: nullableText, sourceType: text, sourceName: nullableText,
  expectedDate: nullableText, createdAt: text, orderedQuantity: quantity, receivedQuantity: quantity, remainingQuantity: quantity,
  activeDocumentImportId: id.nullable(), activeGoodsReceiptId: id.nullable(), activeGoodsReceiptStatus: nullableText,
  assignedTo: id.nullable(), assignedToName: nullableText, assignedAt: nullableText, executionStatus: text,
  priority: text, dueAt: nullableText, lines: z.array(receivingTaskLineSchema),
});
export const receivingTasksSchema = z.object({
  items: z.array(receivingTaskSchema), totalCount: quantity.int(), pageNumber: quantity.int(), pageSize: quantity.int(),
  taskStats: z.object({ totalOpenCount: quantity.int(), unassignedCount: quantity.int(), inProgressCount: quantity.int(), pausedCount: quantity.int() }),
});
export { evidenceSchema };
const planSchema = z.object({ id, slotId: id, slotCode: text, rackCode: text, isSystemDefaultSlot: z.boolean(), quantity });
const putAwayDetailSchema = z.object({
  id, inventoryStockId: id, stockMovementId: id, warehouseId: id, slotId: id, slotCode: text, rackCode: text,
  isSystemDefaultSlot: z.boolean(), lotId: id.nullable(), lotNumber: nullableText, qualityStatus: text,
  performedByUserId: id, performedByName: text, quantity, putAwayAt: text, deviationId: id.nullable(),
  isOffPlan: z.boolean(), deviationReason: nullableText, deviationReasonCode: nullableText, usedHeldSlot: z.boolean(),
  isSlotCodeConfirmed: z.boolean(), deviationEvidence: z.array(evidenceSchema),
});
export const receiptItemSchema = z.object({
  id, inboundRequestItemId: id.nullable(), productId: id, lotId: id.nullable(), lotNumber: nullableText,
  manufacturedDate: nullableText, expiryDate: nullableText, productSKU: text, productName: text, baseUnitId: id,
  baseUnitName: text, enteredUnitId: id.nullable(), enteredUnitName: nullableText, conversionFactorSnapshot: z.number().positive(),
  allowedUnits: z.array(z.object({ unitId: id, unitName: text, unitCode: text, quantityPrecision: quantity.int().max(6), conversionFactor: z.number().positive() })),
  orderedQuantity: quantity, receivedQuantity: quantity, damagedQuantity: quantity, usableQuantity: quantity,
  rejectedQuantity: quantity.default(0), deliveredQuantity: quantity.optional(), isolatedDamagedQuantity: quantity.default(0), remainingDamageIsolationQuantity: quantity.default(0),
  putAwayQuantity: quantity, keptAtReceivingQuantity: quantity.default(0), remainingPutAwayQuantity: quantity, exceptionReason: nullableText,
  putAwayDetails: z.array(putAwayDetailSchema), putAwayPlan: z.array(planSchema),
});
const lifecycleSchema = z.object({ action: text, fromState: nullableText, toState: nullableText, actorId: id,
  actorName: text, reason: nullableText, createdAt: text });
export const receiptSchema = z.object({
  supplierCode: nullableText, supplierName: nullableText, sourceName: nullableText,
  id, receiptCode: text, inboundRequestId: id, inboundRequestCode: text, warehouseId: id, warehouseCode: text,
  warehouseName: text, status: text, createdBy: id, createdByName: text, approvedBy: id.nullable(), approvedByName: nullableText,
  createdAt: text, modifiedAt: nullableText, submittedAt: nullableText, approvedAt: nullableText, rejectionReason: nullableText,
  arrivalConfirmedBy: id.nullable(), arrivalConfirmedAt: nullableText, receivingSlotId: id.nullable(),
  arrivalStockPostedAt: nullableText, sourceRequestVersion: nullableText, putAwayTaskExecutionStatus: text,
  receivingFlowVersion: quantity.int().max(1).default(0), keptAtReceiving: z.boolean().default(false), refusedGoodsHandedBack: z.boolean().default(false), refusalEvidence: z.array(evidenceSchema).default([]),
  putAwayAssignedTo: id.nullable(), putAwayAssignedToName: nullableText, putAwayAssignedAt: nullableText,
  putAwayTaskPriority: text, putAwayTaskDueAt: nullableText, receivingAssignedTo: id.nullable(), receivingAssignedToName: nullableText,
  putAwayTaskCancelledAt: nullableText, putAwayTaskCancellationReason: nullableText, putAwayTaskRequiresReconciliation: z.boolean(),
  putAwayPlanUpdatedAt: nullableText, putAwayTaskReconciledAt: nullableText, putAwayTaskReconciliationNote: nullableText,
  version, items: z.array(receiptItemSchema), history: z.array(lifecycleSchema),
});
export const receiptActionsSchema = warehouseActionsSchema;
const dateInput = text.refine(value => !value || z.iso.date().safeParse(value).success, 'Nhập ngày hợp lệ theo YYYY-MM-DD.');
export const receiptLineInputSchema = z.object({
  inboundRequestItemId: id, enteredUnitId: id, receivedQty: z.number({ error: 'Vui lòng nhập số chấp nhận hợp lệ.' }).finite().min(0, 'Số chấp nhận không được âm.').lt(1e16, 'Số lượng vượt giới hạn cho phép.'),
  rejectedQty: z.number({ error: 'Vui lòng nhập số từ chối hợp lệ.' }).finite().min(0, 'Số từ chối không được âm.').lt(1e16, 'Số lượng vượt giới hạn cho phép.'),
  damagedQty: z.number({ error: 'Vui lòng nhập số lượng hỏng hợp lệ.' }).finite().min(0, 'Số lượng hỏng không được âm.'), exceptionReason: text.trim().max(500, 'Ghi chú tối đa 500 ký tự.'),
  lotNumber: text.trim().max(100, 'Số lô tối đa 100 ký tự.'), manufacturedDate: dateInput, expiryDate: dateInput,
}).superRefine((value, context) => {
  if (value.damagedQty > value.receivedQty) context.addIssue({ code: 'custom', path: ['damagedQty'], message: 'Số hỏng không được vượt số thực nhận.' });
  if (value.receivedQty === 0 && value.rejectedQty === 0) context.addIssue({ code: 'custom', path: ['receivedQty'], message: 'Nhập lượng chấp nhận hoặc từ chối lớn hơn 0.' });
  if ((value.damagedQty > 0 || value.rejectedQty > 0) && !value.exceptionReason) context.addIssue({ code: 'custom', path: ['exceptionReason'], message: 'Vui lòng nhập lý do hàng hỏng hoặc từ chối.' });
  if (value.manufacturedDate && value.expiryDate && value.expiryDate < value.manufacturedDate)
    context.addIssue({ code: 'custom', path: ['expiryDate'], message: 'Hạn sử dụng phải bằng hoặc sau ngày sản xuất.' });
});
const receiptLines = z.array(receiptLineInputSchema).min(1, 'Chọn ít nhất một dòng hàng.').refine(
  lines => new Set(lines.map(line => line.inboundRequestItemId)).size === lines.length, 'Không chọn trùng dòng hàng.');
export const createReceiptFormSchema = z.object({ receiptCode: text.trim().min(1, 'Vui lòng nhập mã phiếu nhận.').max(100, 'Mã phiếu nhận tối đa 100 ký tự.'), lines: receiptLines });
export const updateReceiptFormSchema = z.object({ receiptCode: text.trim().min(1, 'Vui lòng nhập mã phiếu nhận.').max(100, 'Mã phiếu nhận tối đa 100 ký tự.'), lines: receiptLines });
export const createReceiptCommandSchema = createReceiptFormSchema.extend({ inboundRequestId: id, expectedInboundVersion: version, commandId: id });
export const updateReceiptCommandSchema = updateReceiptFormSchema.extend({ expectedVersion: version, commandId: id });
export const submitReceiptCommandSchema = z.object({ expectedVersion: version, commandId: id, receivingSlotId: id.nullable(),
  refusedGoodsHandedBack: z.boolean().optional(), refusalEvidenceIds: z.array(id).max(5).optional() });
export const putAwayFormSchema = z.object({
  goodsReceiptItemId: id, slotId: id, quantity: z.number({ error: 'Vui lòng nhập số lượng thực cất hợp lệ.' }).finite().positive('Số lượng cất phải lớn hơn 0.').lt(1e16, 'Số lượng vượt giới hạn cho phép.').multipleOf(0.01, 'Số lượng chỉ được có tối đa hai chữ số thập phân.'),
  confirmedSlotCode: text.trim().max(100, 'Mã vị trí tối đa 100 ký tự.'), overrideReason: text.trim().max(500, 'Lý do tối đa 500 ký tự.'),
});
export const putAwayCommandSchema = z.object({ expectedVersion: version, commandId: id,
  lines: z.array(z.object({ goodsReceiptItemId: id, slotId: id, quantity: z.number().positive().multipleOf(0.01), confirmedSlotCode: text.max(100) })).min(1),
  overrideReason: text.max(500).optional(),
});
export const isolateDamageCommandSchema = z.object({ goodsReceiptItemId: id, destinationSlotId: id,
  quantity: z.number().positive().multipleOf(0.01), confirmedSlotCode: text.trim().min(1).max(100),
  physicallySeparated: z.literal(true), expectedVersion: version, commandId: id });
const heldSlot = z.object({ slotId: id, slotCode: text, productId: id, sku: text, productName: text,
  heldQuantity: quantity.nullable(), expectedDate: text, inboundRequestCode: text });
export const putAwaySuggestionsSchema = z.object({
  items: z.array(z.object({ goodsReceiptItemId: id, remainingQuantity: quantity, unallocatedQuantity: quantity,
    suggestions: z.array(z.object({ slotId: id, slotCode: text, rackCode: text, zoneName: text, score: z.number().int(),
      reason: text, source: text, warnings: z.array(text), suggestedQuantity: quantity, availableQuantity: quantity.nullable() })) })),
  isAiAssisted: z.boolean(), aiNotice: nullableText, heldSlots: z.array(heldSlot), summary: nullableText, risks: z.array(text),
});
export type ReceivingTask = z.infer<typeof receivingTaskSchema>;
export type ReceivingLocation = z.infer<typeof receivingLocationSchema>;
export type SelectedReceivingLocation = Pick<ReceivingLocation, 'id' | 'slotCode' | 'displayPath'>;
export type Receipt = z.infer<typeof receiptSchema>;
export type ReceiptForm = z.infer<typeof createReceiptFormSchema>;
export type PutAwayForm = z.infer<typeof putAwayFormSchema>;
export type LocationSearch = z.infer<typeof locationSearchSchema>;
export type PutAwaySuggestions = z.infer<typeof putAwaySuggestionsSchema>;
