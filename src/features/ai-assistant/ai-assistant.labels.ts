import type { PillTone } from '@/components/ui/status-pill';

import type { AiDraftStatus } from './ai-assistant.types';

export const AI_DRAFT_STATUS_LABELS: Record<AiDraftStatus, string> = {
  Pending: 'Chờ xác nhận',
  Executed: 'Đã thực hiện',
  Cancelled: 'Đã huỷ',
  Expired: 'Đã hết hạn',
};

export const AI_DRAFT_STATUS_TONES: Record<AiDraftStatus, PillTone> = {
  Pending: 'warning',
  Executed: 'success',
  Cancelled: 'neutral',
  Expired: 'neutral',
};
