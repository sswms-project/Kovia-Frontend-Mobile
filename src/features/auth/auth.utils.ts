import type { ApiErrorResponse } from '@/types/api';

const DEFAULT_LOCK_SECONDS = 900;

export function getTemporaryLockSeconds(error: Pick<ApiErrorResponse, 'errors'>): number {
  const retryAfter = Number(error.errors?.retryAfterSeconds?.[0]);
  return Number.isFinite(retryAfter) && retryAfter > 0
    ? Math.ceil(retryAfter)
    : DEFAULT_LOCK_SECONDS;
}

export function formatLockCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

// The BE reports 2FA failures only through message text, so these must match its wording.
const SESSION_EXPIRED_MESSAGE = 'Mã xác thực đã hết hạn hoặc không hợp lệ.';
const INVALID_OTP_MESSAGE = 'Mã OTP không đúng.';
const USER_NOT_FOUND_MESSAGE = 'Người dùng không tồn tại.';
const ACCOUNT_INACTIVE_MESSAGE = 'Tài khoản không hoạt động.';

export type Verify2FAErrorKind =
  | 'sessionExpired'
  | 'invalidOtp'
  | 'accountUnavailable'
  | 'network'
  | 'unknown';

export function classifyVerify2FAError(error: ApiErrorResponse): Verify2FAErrorKind {
  if (error.statusCode === 401 && error.message === SESSION_EXPIRED_MESSAGE) return 'sessionExpired';
  if (error.statusCode === 401 && error.message === INVALID_OTP_MESSAGE) return 'invalidOtp';
  if (
    error.statusCode === 401 &&
    (error.message === USER_NOT_FOUND_MESSAGE || error.message === ACCOUNT_INACTIVE_MESSAGE)
  ) {
    return 'accountUnavailable';
  }
  if (error.statusCode === 0 || error.statusCode >= 500) return 'network';
  return 'unknown';
}

export function isAccountInactiveError(error: ApiErrorResponse): boolean {
  return error.message === ACCOUNT_INACTIVE_MESSAGE;
}
