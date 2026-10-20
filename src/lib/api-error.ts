import type { ApiErrorResponse } from '@/types/api';

import { logger } from './logger';

const FALLBACK_MESSAGE = 'Đã xảy ra lỗi. Vui lòng thử lại.';

// ApiError from '@/lib/api' satisfies this shape structurally.
export const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ApiErrorResponse).statusCode === 'number' &&
  typeof (value as ApiErrorResponse).message === 'string';

// FluentValidation returns { field: [msg, ...] }; flatten it so the user sees which
// field failed instead of a bare "Validation failed".
const flattenFieldErrors = (errors: Record<string, string[]>): string =>
  Object.entries(errors)
    .filter(([field]) => field !== 'code')
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join(' | ');

/** Stable machine-readable error code returned through the API error envelope. */
export function getApiErrorCode(error: unknown): string | undefined {
  if (!isApiErrorResponse(error)) return undefined;
  return error.errors?.code?.find((code) => code.trim().length > 0);
}

export type ApiErrorKind = 'network' | 'unauthorized' | 'forbidden' | 'notFound' | 'server' | 'unknown';

/**
 * Coarse bucket for choosing how to present a failure. Status 0 means the request never got a
 * response (offline, timeout), which the api client normalises into an ApiError.
 */
export function getApiErrorKind(error: unknown): ApiErrorKind {
  if (!isApiErrorResponse(error)) return 'unknown';
  if (error.statusCode === 0) return 'network';
  if (error.statusCode === 401) return 'unauthorized';
  if (error.statusCode === 403) return 'forbidden';
  if (error.statusCode === 404) return 'notFound';
  if (error.statusCode >= 500) return 'server';
  return 'unknown';
}

/** Human-readable message for a toast. */
export function getApiErrorMessage(error: unknown, fallback = FALLBACK_MESSAGE): string {
  if (!isApiErrorResponse(error)) return error instanceof Error ? error.message : fallback;

  const fieldErrors = error.errors ? flattenFieldErrors(error.errors) : '';
  return fieldErrors ? `${error.message} — ${fieldErrors}` : error.message;
}

/** Single-line form for `logger.error`; plain objects print as `{}` in the RN log. */
export function formatApiError(error: unknown): string {
  if (!isApiErrorResponse(error)) return String(error);
  return `[${error.statusCode}] ${getApiErrorMessage(error)}`;
}

/**
 * 4xx is a deliberate server rejection already shown to the user (missing permission, stale data,
 * wrong barcode...), so only warn; unexpected errors are logged at error level.
 */
export function logApiError(error: unknown) {
  if (isApiErrorResponse(error) && error.statusCode >= 400 && error.statusCode < 500) {
    logger.warn(`Yêu cầu bị từ chối (${error.statusCode}): ${error.message}`);
    return;
  }
  logger.error(formatApiError(error));
}
