import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

const id = nonEmptyDotNetGuidSchema('Mã điều chuyển không hợp lệ.');
const quantity = z.number().finite().nonnegative();
const text = z.string();
const nullableText = text.nullable();
export const transferSuggestionSchema = z.object({ inventoryStockId: id, slotId: id, slotCode: text,
  slotBarcode: nullableText, lotId: id.nullable(), lotNumber: nullableText, expiryDate: nullableText,
  suggestedQuantity: quantity, reservedQuantity: quantity, rackCode: nullableText, isSystemDefaultSlot: z.boolean(),
  rackId: id.nullable(), zoneCode: nullableText });
export const transferPickLineSchema = z.object({ lineId: id, itemId: id, productId: id, sku: text,
  productName: text, productBarcode: nullableText, baseUnitName: text, plannedQuantity: quantity,
  pickedQuantity: quantity, remainingQuantity: quantity, pendingReturnQuantity: quantity, status: text,
  suggestions: z.array(transferSuggestionSchema),
  picks: z.array(z.object({ id, inventoryStockId: id, slotCode: text, lotId: id.nullable(), lotNumber: nullableText,
    pickedQuantity: quantity, returnedQuantity: quantity, dispatchedQuantity: quantity, pickedAt: text,
    rackCode: nullableText, isSystemDefaultSlot: z.boolean(), rackId: id.nullable(), zoneCode: nullableText })),
  exceptions: z.array(z.object({ id, type: text, reasonCode: text, note: nullableText, quantity, status: text,
    resolution: nullableText, createdAt: text, resolvedAt: nullableText, isNonFefo: z.boolean() })) });
export const transferPickSheetSchema = z.object({ shipmentId: id, shipmentNumber: z.number().int().positive(),
  transferId: id, transferCode: text, sourceWarehouseId: id, sourceWarehouseName: text,
  destinationWarehouseId: id, destinationWarehouseName: text, shipmentStatus: text, version: nullableText,
  lines: z.array(transferPickLineSchema) });
// Only authorization/context fields are projected from the full transfer detail DTO.
export const transferScopeSchema = z.object({ id, sourceWarehouseId: id, status: text, isLegacyWorkflow: z.boolean(),
  shipments: z.array(z.object({ id, status: text, version: nullableText, pickTaskId: id.nullable(),
    pickAssigneeId: id.nullable(), pickTaskStatus: nullableText })).nullable() });
export const transferPickFormSchema = z.object({ lineId: id, inventoryStockId: id,
  quantity: z.number({ error: 'Vui lòng nhập số lượng thực tế lấy.' }).finite().positive('Số lượng lấy phải lớn hơn 0.')
    .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7, 'Số lượng tối đa hai chữ số thập phân.'),
  scannedSlotCode: text.trim().min(1, 'Vui lòng quét hoặc nhập mã vị trí.').max(100, 'Mã vị trí tối đa 100 ký tự.'),
  scannedProductCode: text.trim().min(1, 'Vui lòng quét hoặc nhập mã sản phẩm.').max(100, 'Mã sản phẩm tối đa 100 ký tự.') });
export const transferPickCommandSchema = transferPickFormSchema.extend({ transferId: id, shipmentId: id, commandId: id });
export const transferCompleteCommandSchema = z.object({ transferId: id, shipmentId: id,
  expectedVersion: text.min(1, 'Thiếu phiên bản đợt xuất. Vui lòng tải lại.') });
export const TRANSFER_PICK_REASONS = ['InsufficientAtLocation', 'NotFound', 'Damaged', 'LocationBlocked', 'LotExhausted',
  'NonFefoLot', 'Other'] as const;
export const TRANSFER_PICK_REASON_LABELS: Record<(typeof TRANSFER_PICK_REASONS)[number], string> = {
  InsufficientAtLocation: 'Không đủ hàng tại vị trí', NotFound: 'Không tìm thấy hàng', Damaged: 'Hàng hư hỏng',
  LocationBlocked: 'Vị trí bị chặn', LotExhausted: 'Lô đã hết', NonFefoLot: 'Lô không theo FEFO', Other: 'Lý do khác' };
const reasonCode = z.enum(TRANSFER_PICK_REASONS, { error: 'Vui lòng chọn lý do.' });
export const transferPickAlternativeSchema = z.object({ inventoryStockId: id, slotId: id, slotCode: text,
  slotBarcode: nullableText, lotId: id.nullable(), lotNumber: nullableText, expiryDate: nullableText,
  availableQuantity: quantity, rackCode: nullableText, isSystemDefaultSlot: z.boolean(),
  rackId: id.nullable().optional(), zoneCode: nullableText.optional() });
export const transferPickAlternativesSchema = z.array(transferPickAlternativeSchema);
const qty = z.number({ error: 'Vui lòng nhập số lượng.' }).finite().positive('Số lượng phải lớn hơn 0.')
  .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7, 'Số lượng tối đa hai chữ số thập phân.');
const requireNote = (value: { reasonCode: string; note: string | null }, ctx: z.RefinementCtx) => {
  if (value.reasonCode === 'Other' && !value.note?.trim()) ctx.addIssue({ code: 'custom', path: ['note'], message: 'Vui lòng nhập ghi chú cho lý do khác.' });
};
export const transferSwitchFormSchema = z.object({ fromInventoryStockId: id, toInventoryStockId: id, quantity: qty,
  reasonCode, note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự.').nullable() }).superRefine(requireNote);
export const transferSwitchCommandSchema = z.object({ transferId: id, shipmentId: id, lineId: id, commandId: id,
  fromInventoryStockId: id, toInventoryStockId: id, quantity: qty, reasonCode, note: z.string().trim().max(500).nullable() });
export const transferEscalateFormSchema = z.object({ reasonCode,
  note: z.string().trim().min(1, 'Vui lòng nhập ghi chú.').max(500, 'Ghi chú tối đa 500 ký tự.') });
export const transferEscalateCommandSchema = z.object({ transferId: id, shipmentId: id, lineId: id, commandId: id,
  reasonCode, note: z.string().trim().min(1).max(500) });
export const transferReturnFormSchema = z.object({ pickDetailId: id, quantity: qty.nullable(),
  scannedSlotCode: text.trim().min(1, 'Vui lòng quét hoặc nhập mã vị trí.').max(100, 'Mã vị trí tối đa 100 ký tự.') });
export const transferReturnCommandSchema = transferReturnFormSchema.extend({ transferId: id, shipmentId: id, commandId: id });
export type TransferPickAlternative = z.infer<typeof transferPickAlternativeSchema>;
export type TransferSwitchForm = z.infer<typeof transferSwitchFormSchema>;
export type TransferEscalateForm = z.infer<typeof transferEscalateFormSchema>;
export type TransferReturnForm = z.infer<typeof transferReturnFormSchema>;
export type TransferPickForm =z.infer<typeof transferPickFormSchema>;
export type TransferPickLine = z.infer<typeof transferPickLineSchema>;
export type TransferPickSheet = z.infer<typeof transferPickSheetSchema>;
export type TransferScope = z.infer<typeof transferScopeSchema>;
