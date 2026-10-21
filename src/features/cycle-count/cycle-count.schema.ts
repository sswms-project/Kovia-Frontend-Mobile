import { z } from 'zod';

const evidenceSchema = z.object({ id: z.string(), fileName: z.string() });

export const cycleCountItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  productBarcode: z.string().nullish(),
  slotId: z.string(),
  slotCode: z.string(),
  slotBarcode: z.string().nullish(),
  rackCode: z.string().nullish(),
  isSystemDefaultSlot: z.boolean(),
  lotNumber: z.string().nullish(),
  expiryDate: z.string().nullish(),
  qualityStatus: z.string(),
  unitName: z.string().nullish(),
  systemQuantity: z.number().nullish(),
  difference: z.number().nullish(),
  countedQuantity: z.number().nullish(),
  countedDamagedQuantity: z.number().nullish(),
  note: z.string().nullish(),
  damageReason: z.string().nullish(),
  damageEvidence: z.array(evidenceSchema).nullish(),
  requestedRecountRound: z.number().nullish(),
  countHistory: z
    .array(
      z.object({
        recountRound: z.number(),
        countedQuantity: z.number().nullish(),
        recountReason: z.string().nullish(),
      }),
    )
    .nullish(),
});

export const cycleCountSchema = z.object({
  id: z.string(),
  code: z.string(),
  warehouseId: z.string(),
  warehouseName: z.string(),
  zoneName: z.string().nullish(),
  status: z.string(),
  scheduledDate: z.string().nullish(),
  dueAt: z.string().nullish(),
  priority: z.string(),
  purpose: z.string().nullish(),
  isBlindCount: z.boolean(),
  recountRound: z.number(),
  assignedTo: z.string().nullish(),
  items: z.array(cycleCountItemSchema),
});

export const cycleCountActionsSchema = z.object({
  allowedActions: z.array(z.string()),
  denialReasonCode: z.string().nullish(),
});

export const cycleCountEvidenceSchema = z.object({ id: z.string(), fileName: z.string() });

export type CycleCountItem = z.infer<typeof cycleCountItemSchema>;
export type CycleCount = z.infer<typeof cycleCountSchema>;
export type CycleCountActions = z.infer<typeof cycleCountActionsSchema>;

// Decimal with up to 2 places; BE stores 2 decimals. A comma is accepted for Vietnamese keyboards.
const QUANTITY_PATTERN = /^\d+([.,]\d{1,2})?$/;
const QUANTITY_MESSAGE = 'Nhập số không âm, tối đa 2 chữ số thập phân';

export function parseQuantity(value: string): number {
  return Number(value.trim().replace(',', '.'));
}

export const countFormSchema = z
  .object({
    countedQuantity: z.string().trim().regex(QUANTITY_PATTERN, QUANTITY_MESSAGE),
    damagedQuantity: z.string().trim().refine((value) => value === '' || QUANTITY_PATTERN.test(value), QUANTITY_MESSAGE),
    damageReason: z.string().trim().max(500, 'Tối đa 500 ký tự'),
    note: z.string().trim().max(500, 'Tối đa 500 ký tự'),
  })
  .superRefine((values, context) => {
    if (!QUANTITY_PATTERN.test(values.countedQuantity)) return;
    const counted = parseQuantity(values.countedQuantity);
    const damaged = values.damagedQuantity === '' ? 0 : parseQuantity(values.damagedQuantity);
    if (damaged > counted) {
      context.addIssue({
        code: 'custom',
        path: ['damagedQuantity'],
        message: 'Số lượng hỏng không được vượt quá số đã đếm',
      });
    }
    if (damaged > 0 && values.damageReason === '') {
      context.addIssue({ code: 'custom', path: ['damageReason'], message: 'Nhập lý do hàng hỏng' });
    }
  });

export type CountFormValues = z.infer<typeof countFormSchema>;
