import { z } from 'zod';

export const REJECT_REASON_MAX_LENGTH = 500;

// Mirrors the BE reject validators: NotEmpty + MaximumLength(500), trimmed server-side.
export const rejectReasonSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập lý do từ chối.')
  .max(REJECT_REASON_MAX_LENGTH, `Lý do không được vượt quá ${REJECT_REASON_MAX_LENGTH} ký tự.`);
