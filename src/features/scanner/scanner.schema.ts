import { z } from 'zod';

export const manualCodeSchema = z.object({
  code: z.string().trim().min(1, 'Nhập mã cần xác nhận'),
});

export type ManualCodeFormValues = z.infer<typeof manualCodeSchema>;
