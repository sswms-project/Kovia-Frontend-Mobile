import type { PillTone } from '@/components/ui/status-pill';

import type { ForecastRunStatus, ForecastSuggestionStatus } from './forecast.types';

export const FORECAST_RUN_STATUS_LABELS: Record<ForecastRunStatus, string> = {
  Pending: 'Chờ chạy',
  Running: 'Đang chạy',
  Completed: 'Hoàn tất',
  Failed: 'Thất bại',
};

export const FORECAST_RUN_STATUS_TONES: Record<ForecastRunStatus, PillTone> = {
  Pending: 'neutral',
  Running: 'primary',
  Completed: 'success',
  Failed: 'danger',
};

export const SUGGESTION_STATUS_LABELS: Record<ForecastSuggestionStatus, string> = {
  New: 'Mới',
  Accepted: 'Đã chấp nhận',
  Rejected: 'Đã từ chối',
  Expired: 'Hết hạn',
};

export const SUGGESTION_STATUS_TONES: Record<ForecastSuggestionStatus, PillTone> = {
  New: 'primary',
  Accepted: 'success',
  Rejected: 'neutral',
  Expired: 'warning',
};
