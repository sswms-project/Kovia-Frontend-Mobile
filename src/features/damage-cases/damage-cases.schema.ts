import { z } from 'zod';

const QUANTITY_PATTERN = /^\d+([.,]\d{1,2})?$/;

export const MAX_REPORT_PHOTOS = 3;

export function parseReportQuantity(value: string): number {
  return Number(value.trim().replace(',', '.'));
}

/**
 * Mirrors the BE ReportDamagedStock validator. A confirmed report needs a quantity within what is
 * still available; an observation sends no quantity and leaves stock unchanged until confirmed.
 */
export function createReportDamageSchema(availableQuantity: number) {
  return z
    .object({
      mode: z.enum(['Confirmed', 'Observation']),
      quantity: z.string().trim(),
      reason: z.string().trim().min(1, 'Nhập lý do hàng hỏng').max(500, 'Tối đa 500 ký tự'),
    })
    .superRefine((values, context) => {
      if (values.mode !== 'Confirmed') return;
      if (!QUANTITY_PATTERN.test(values.quantity) || parseReportQuantity(values.quantity) <= 0) {
        context.addIssue({
          code: 'custom',
          path: ['quantity'],
          message: 'Nhập số lượng lớn hơn 0, tối đa 2 chữ số thập phân',
        });
        return;
      }
      if (parseReportQuantity(values.quantity) > availableQuantity) {
        context.addIssue({
          code: 'custom',
          path: ['quantity'],
          message: `Chỉ có ${availableQuantity} đơn vị chưa được giữ.`,
        });
      }
    });
}

export type ReportDamageFormValues = z.infer<ReturnType<typeof createReportDamageSchema>>;
