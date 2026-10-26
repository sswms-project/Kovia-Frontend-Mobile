import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { warehouseStagingPointsSchema } from '@/lib/warehouse-contract.schema';

const id = nonEmptyDotNetGuidSchema('Mã điều chuyển không hợp lệ.');
const quantity = z.number().finite().nonnegative();
const text = z.string();
const nullableText = text.nullable();
export const transferSuggestionSchema = z.object({ inventoryStockId: id, slotId: id, slotCode: text,
  slotBarcode: nullableText, lotId: id.nullable(), lotNumber: nullableText, expiryDate: nullableText,
  suggestedQuantity: quantity, reservedQuantity: quantity, rackCode: nullableText, isSystemDefaultSlot: z.boolean(),
  rackId: id.nullable(), zoneCode: nullableText });
export const transferPickLineSchema = z.object({ lineId: id, itemId: id, productId: id, sku: text,
  productName: text, productBarcode: nullableText, baseUnitName: text, baseQuantityPrecision: z.number().int().min(0).max(2).default(2), plannedQuantity: quantity,
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
  lines: z.array(transferPickLineSchema), outboundStagingFlowVersion: z.number().int().nonnegative().default(0),
  outboundStagingSlotId: id.nullable().default(null), stagingPoints: warehouseStagingPointsSchema.nullable().default(null) });
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
  expectedVersion: text.min(1, 'Thiếu phiên bản đợt xuất. Vui lòng tải lại.'), outboundStagingSlotId: id.optional(), commandId: id });
export type TransferPickForm = z.infer<typeof transferPickFormSchema>;
export type TransferPickLine = z.infer<typeof transferPickLineSchema>;
export type TransferPickSheet = z.infer<typeof transferPickSheetSchema>;
export type TransferScope = z.infer<typeof transferScopeSchema>;
