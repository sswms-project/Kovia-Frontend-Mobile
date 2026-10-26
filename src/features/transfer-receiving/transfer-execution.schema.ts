import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

const id = nonEmptyDotNetGuidSchema('Mã công việc không hợp lệ.');
const text = z.string();
const quantity = z.number().finite().nonnegative().lt(1e16);
const common = { expectedVersion: text.min(1), commandId: id };
export const startTransferReceivingSchema = z.object({ ...common, receivingSlotId: id, scannedSlotCode: text.trim().min(1).max(200).optional() });
export const resumeTransferPutAwaySchema = z.object(common);
export const submitTransferReceivingSchema = z.object({ ...common, keepAtReceiving: z.boolean(), damagedSlotId: id.nullable(),
  scannedDamagedSlotCode: text.trim().max(200).nullable(), entries: z.array(z.object({ lineId: id, lotId: id.nullable(),
    goodQuantity: quantity, damagedQuantity: quantity, missingQuantity: quantity,
    reasonCode: text.trim().max(50).nullable(), note: text.trim().max(500).nullable() })).min(1).max(500) });
export const putAwayTransferSchema = z.object({ ...common, planVersion: text.min(1), entries: z.array(z.object({
  lineId: id, lotId: id.nullable(), qualityStatus: z.literal('Good'), destinationSlotId: id, quantity: quantity.positive(),
  scannedSlotCode: text.trim().min(1).max(100), scannedProductCode: text.trim().min(1).max(100),
  deviationReasonCode: z.literal('Other').nullable(), note: text.trim().max(500).nullable(), slotCodeUnreadable: z.literal(false),
})).length(1) });
export const transferExecutionSlotsSchema = z.array(z.object({ id, code: text, path: text }));
export type TransferExecutionSlot = z.infer<typeof transferExecutionSlotsSchema>[number];
export type TransferReceiptEntry = z.infer<typeof submitTransferReceivingSchema>['entries'][number];
export const transferReceiptDraftSchema = z.object({ action: z.enum(['Start', 'Receipt', 'PutAway']),
  counts: z.record(z.string(), z.object({ good: text.max(20), damaged: text.max(20), missing: text.max(20), reason: text.max(50) })),
  scan: text.max(200), damageScan: text.max(200), productScan: text.max(200), putQuantity: text.max(20), note: text.max(500),
}).superRefine((value, context) => {
  const numeric = (input: string) => input.trim() ? Number(input.trim().replace(',', '.')) : Number.NaN;
  if (value.action === 'Receipt') {
    for (const [key, row] of Object.entries(value.counts)) for (const field of ['good', 'damaged', 'missing'] as const)
      if (!Number.isFinite(numeric(row[field])) || numeric(row[field]) < 0)
        context.addIssue({ code: 'custom', path: ['counts', key, field], message: 'Nhập số thực tế không âm.' });
  }
  if (value.action === 'PutAway') {
    if (!Number.isFinite(numeric(value.putQuantity)) || numeric(value.putQuantity) <= 0)
      context.addIssue({ code: 'custom', path: ['putQuantity'], message: 'Nhập số thực cất lớn hơn 0.' });
    for (const field of ['scan', 'productScan'] as const) if (!value[field].trim())
      context.addIssue({ code: 'custom', path: [field], message: 'Vui lòng xác nhận mã thực tế.' });
  }
});
export type TransferReceiptDraft = z.infer<typeof transferReceiptDraftSchema>;
export type TransferExecutionTarget = { action: 'Start'; body: z.infer<typeof startTransferReceivingSchema> }
  | { action: 'Submit'; body: z.infer<typeof submitTransferReceivingSchema> }
  | { action: 'PutAway'; body: z.infer<typeof putAwayTransferSchema> }
  | { action: 'Resume'; body: z.infer<typeof resumeTransferPutAwaySchema> };
