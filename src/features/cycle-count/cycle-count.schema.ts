import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

const id = nonEmptyDotNetGuidSchema('Mã kiểm kê không hợp lệ.');
const text = z.string(), nullableText = text.nullable();
const quantity = z.number({ error: 'Vui lòng nhập số lượng hợp lệ.' }).finite().nonnegative('Số lượng không được âm.');
const history = z.object({ id, recountRound: quantity.int(), countedQuantity: quantity, countedBy: id, countedAt: text,
  recountRequestedBy: id, recountRequestedAt: text, recountReason: text, countedByName: nullableText,
  recountRequestedByName: nullableText, systemQuantity: quantity.nullable(), countMethod: z.enum(['Manual', 'Scanned']) });
export const countItemSchema = z.object({ id, productId: id, productName: text, productSku: text, slotId: id, slotCode: text,
  systemQuantity: quantity.nullable(), countedQuantity: quantity.nullable(), difference: z.number().finite().nullable(),
  countedBy: id.nullable(), countedAt: nullableText, requestedRecountRound: quantity.int().nullable(),
  activeAdjustmentId: id.nullable(), activeAdjustmentStatus: nullableText, countHistory: z.array(history), lotId: id.nullable(),
  lotNumber: nullableText, qualityStatus: text, unitName: nullableText, rackCode: nullableText, isSystemDefaultSlot: z.boolean(),
  expiryDate: nullableText, countedByName: nullableText, note: nullableText, countedDamagedQuantity: quantity.nullable(),
  countMethod: z.enum(['Manual', 'Scanned']), scannedBarcode: nullableText, productBarcode: nullableText, slotBarcode: nullableText,
  damageReason: nullableText, damageEvidence: z.array(z.object({ id, fileName: text })).nullable(), damageConfirmedAt: nullableText,
  damageCaseId: id.nullable(), damageCaseStatus: nullableText, snapshotCapturedAt: nullableText });
export const cycleCountSchema = z.object({ id, warehouseId: id, warehouseName: text, zoneId: id.nullable(), zoneName: nullableText,
  status: z.enum(['Scheduled', 'Counting', 'Recount', 'Submitted', 'Completed', 'Cancelled']), scheduledDate: text,
  priority: text, dueAt: nullableText, isBlindCount: z.boolean(), recountRound: quantity.int(), assignedTo: id.nullable(),
  assignedToName: text, submittedBy: id.nullable(), submittedAt: nullableText, completedAt: nullableText, createdAt: text,
  items: z.array(countItemSchema), code: text, purpose: nullableText, dueDate: nullableText, cancelledAt: nullableText,
  cancelReason: nullableText, createdByName: nullableText, submittedByName: nullableText, finalizedByName: nullableText,
  finalizedAt: nullableText, cancelledByName: nullableText, version: nullableText });
export const countFormSchema = z.object({ countedQuantity: quantity,
  countedDamagedQuantity: quantity, note: text.trim().max(500, 'Ghi chú tối đa 500 ký tự.'),
  countMethod: z.enum(['Manual', 'Scanned']), scannedBarcode: text.trim().max(100, 'Mã quét tối đa 100 ký tự.'),
  damageReason: text.trim().max(500, 'Lý do tối đa 500 ký tự.'), damageEvidenceIds: z.array(id).max(3) })
  .superRefine((values, context) => {
    if (values.countedDamagedQuantity > values.countedQuantity) context.addIssue({ code: 'custom', path: ['countedDamagedQuantity'], message: 'Số hỏng không được vượt số đếm thực tế.' });
    if (values.countedDamagedQuantity > 0 && !values.damageReason) context.addIssue({ code: 'custom', path: ['damageReason'], message: 'Vui lòng nhập lý do hàng hỏng.' });
    if (values.countMethod === 'Scanned' && !values.scannedBarcode) context.addIssue({ code: 'custom', path: ['scannedBarcode'], message: 'Vui lòng quét mã sản phẩm.' });
    for (const name of ['countedQuantity', 'countedDamagedQuantity'] as const) {
      const scaled = values[name] * 100;
      if (!Number.isSafeInteger(Math.round(scaled)) || Math.abs(scaled - Math.round(scaled)) > 1e-7)
        context.addIssue({ code: 'custom', path: [name], message: 'Số lượng chỉ hỗ trợ tối đa hai chữ số thập phân.' });
    }
  });
export const countExecutionSchema = z.object({ expectedVersion: text.min(1), commandId: id });
export type CycleCount = z.infer<typeof cycleCountSchema>;
export type CountItem = z.infer<typeof countItemSchema>;
export type CountForm = z.infer<typeof countFormSchema>;
