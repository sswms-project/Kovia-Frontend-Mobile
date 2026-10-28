import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { warehouseStagingPointsSchema } from '@/lib/warehouse-contract.schema';

const id = nonEmptyDotNetGuidSchema('Mã điều chuyển không hợp lệ.');
const text = z.string();
const nullableText = text.nullable();
const quantity = z.number().finite().nonnegative();
const receiptLot = z.object({ lotId: id.nullable(), lotNumber: nullableText, expiryDate: nullableText,
  dispatchedQuantity: quantity, initialGoodQuantity: quantity, initialDamagedQuantity: quantity,
  initialMissingQuantity: quantity, lateReceivedQuantity: quantity, actualGoodQuantity: quantity });
export const transferReceiptLineSchema = z.object({ lineId: id, itemId: id, productId: id, sku: text,
  productName: text, barcode: nullableText, baseUnitName: text, baseQuantityPrecision: z.number().int().min(0).max(2),
  lots: z.array(receiptLot) });
export const transferReceiptSheetSchema = z.object({ transferId: id, shipmentId: id, transferCode: text,
  shipmentNumber: z.number().int().positive(), status: text, receiptFlowVersion: z.number().int().min(0).max(255),
  version: nullableText, arrivedAt: nullableText, arrivedBy: id.nullable(), receiptSubmittedAt: nullableText,
  receiptSubmittedBy: id.nullable(), lines: z.array(transferReceiptLineSchema), receivingSlotId: id.nullable().default(null),
  arrivalStockPostedAt: nullableText.default(null), keptAtReceiving: z.boolean().default(false),
  outboundStagingFlowVersion: z.number().int().nonnegative().default(0), stagingPoints: warehouseStagingPointsSchema.nullable().default(null),
  execution: z.object({ sourceWarehouseId: id, destinationWarehouseId: id, destinationWarehouseName: text,
    receiveAssigneeId: id.nullable(), putAwayAssigneeId: id.nullable(), putAwayAssigneeName: nullableText }).nullable().optional() });
export const transferPutAwayRowSchema = z.object({ lineId: id, itemId: id, productId: id, sku: text, productName: text,
  baseUnitName: text, baseQuantityPrecision: z.number().int().min(0).max(2), lotId: id.nullable(), lotNumber: nullableText,
  qualityStatus: text, actualQuantity: quantity, putAwayQuantity: quantity, remainingQuantity: quantity, keptAtReceivingQuantity: quantity.default(0),
  planMode: text, planBudgets: z.array(z.object({ slotId: id, slotCode: text, path: text, remainingBudget: quantity })) });
export const transferPutAwayEventSchema = z.object({ id, lineId: id, lotId: id.nullable(), qualityStatus: text,
  slotId: id, path: text, quantity, isLateReceipt: z.boolean(), isOffPlan: z.boolean(), slotCodeUnreadable: z.boolean(),
  deviationReasonCode: nullableText, note: nullableText, putAwayBy: id, putAwayAt: text });
export const transferPutAwaySheetSchema = z.object({ receipt: transferReceiptSheetSchema, planVersion: text,
  rows: z.array(transferPutAwayRowSchema), putAwayLines: z.array(transferPutAwayEventSchema), canResumePutAway: z.boolean().default(false) });
// Scope projection of StockTransferResponse; the full operational DTO is not cached here.
export const transferDestinationScopeSchema = z.object({ id, destinationWarehouseId: id, destinationWarehouseName: text,
  sourceWarehouseName: text, status: text, isLegacyWorkflow: z.boolean(), shipments: z.array(z.object({ id,
    status: text, version: nullableText, receiveTaskId: id.nullable(), receiveAssigneeId: id.nullable(),
    receiveTaskStatus: nullableText, putAwayTaskId: id.nullable(), putAwayAssigneeId: id.nullable(), putAwayTaskStatus: nullableText })).nullable() });
export type TransferReceivingMode = 'Receive' | 'PutAway';
export type TransferReceiptSheet = z.infer<typeof transferReceiptSheetSchema>;
export type TransferReceiptLine = z.infer<typeof transferReceiptLineSchema>;
export type TransferPutAwayRow = z.infer<typeof transferPutAwayRowSchema>;
export type TransferPutAwaySheet = z.infer<typeof transferPutAwaySheetSchema>;
export type TransferPutAwayEvent = z.infer<typeof transferPutAwayEventSchema>;
export type TransferDestinationScope = z.infer<typeof transferDestinationScopeSchema>;
