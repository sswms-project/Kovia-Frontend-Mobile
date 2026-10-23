import { z } from 'zod';

// Mirrors the FE reason dialog: required, trimmed, at most 500 characters.
export const taskActionReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do.')
    .max(500, 'Lý do không được vượt quá 500 ký tự.'),
});

export type TaskActionReasonFormValues = z.infer<typeof taskActionReasonSchema>;
