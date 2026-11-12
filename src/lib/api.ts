import axios, { create as createAxios, isAxiosError, isCancel } from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { tokenStorage } from './token-storage';
import { decodeJwtPayload } from './jwt';

const raw = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:7070').replace(/\/+$/, '');
export const API_BASE_URL = raw.endsWith('/api') ? raw : `${raw}/api`;

// Backend bọc mọi response trong ApiResponse<T>
export type ApiResponse<T> = { isSuccess: boolean; statusCode: number; message: string; data: T };

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export const api = createAxios({ baseURL: API_BASE_URL, timeout: 15000 });

const accessDeniedListeners = new Set<() => void>();
export function subscribeAccessDenied(listener: () => void) {
  accessDeniedListeners.add(listener);
  return () => { accessDeniedListeners.delete(listener); };
}

let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (fn: () => void) => {
  onSessionExpired = fn;
};

type RetryConfig = InternalAxiosRequestConfig & { retryAccessToken?: string };

function isPublicAuth(url: string) {
  if (!url.startsWith('/auth/')) return false;
  if (url === '/auth/sessions/complete') return true;
  return !['/auth/me', '/auth/logout', '/auth/change-password', '/auth/sessions'].includes(url) &&
    !url.startsWith('/auth/sessions/');
}

api.interceptors.request.use(async (config: RetryConfig) => {
  if (isPublicAuth(config.url ?? '')) return config;
  const tokens = await tokenStorage.get();
  if (config.retryAccessToken && config.retryAccessToken !== tokens?.accessToken)
    throw new ApiError('Phiên làm việc đã thay đổi. Vui lòng thử lại.', 409);
  // SecureStore may yield while the account or warehouse changes.
  if ('assertCurrentContext' in config && typeof config.assertCurrentContext === 'function') {
    try {
      config.assertCurrentContext();
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Phiên làm việc đã thay đổi.', 409);
    }
  }
  if (tokens) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  return config;
});

// Gộp các request 401 đồng thời vào một lần refresh
const refreshes = new Map<string, Promise<string | null>>();

const refreshAccessToken = async (failedToken: string): Promise<string | null> => {
  const tokens = await tokenStorage.get();
  if (!tokens) return null;
  if (tokens.accessToken !== failedToken) {
    const previous = decodeJwtPayload(failedToken);
    const current = decodeJwtPayload(tokens.accessToken);
    return previous?.sid && previous.sid === current?.sid && previous.user_id === current?.user_id &&
      previous.tenant_id === current?.tenant_id ? tokens.accessToken : null;
  }
  try {
    const send = () => axios.post<ApiResponse<Tokens>>(`${API_BASE_URL}/auth/refresh`, tokens, { timeout: 30_000 });
    const res = await send().catch(async (error: unknown) => {
      if (isAxiosError(error) && !isCancel(error) &&
        (!error.response || [502, 503, 504].includes(error.response.status)) &&
        decodeJwtPayload(tokens.accessToken)?.sid &&
        (await tokenStorage.get())?.refreshToken === tokens.refreshToken) return send();
      throw error;
    });
    // Logout can finish while refresh is in flight; never restore that old session.
    if (!(await tokenStorage.replaceIfCurrent(tokens.refreshToken, res.data.data))) return null;
    return res.data.data.accessToken;
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status ?? 0 : 0;
    if (status !== 401)
      throw new ApiError('Chưa thể làm mới phiên. Vui lòng kiểm tra kết nối và thử lại.', status);
    await tokenStorage.clearIfCurrent(tokens.refreshToken);
    return null;
  }
};

type Tokens = { accessToken: string; refreshToken: string };

api.interceptors.response.use(
  (res) => res,
  async (
    error: AxiosError<{ message?: string; statusCode?: number; errors?: Record<string, string[]> }>,
  ) => {
    if (error instanceof ApiError) return Promise.reject(error);
    const original = error.config as RetryConfig | undefined;
    const url = original?.url ?? '';
    const authorization = original?.headers.Authorization;
    const failedToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
      ? authorization.slice(7) : null;

    if (error.response?.status === 403 && original &&
      !original.url?.startsWith('/auth/') && !original.url?.startsWith('/settings/'))
      accessDeniedListeners.forEach((listener) => listener());

    if (error.response?.status === 401 && original && failedToken && !original.retryAccessToken &&
      !isPublicAuth(url) && !url.startsWith('/settings/2fa')) {
      let refresh = refreshes.get(failedToken);
      if (!refresh) {
        refresh = refreshAccessToken(failedToken).finally(() => refreshes.delete(failedToken));
        refreshes.set(failedToken, refresh);
      }
      const token = await refresh;
      if (token) {
        original.retryAccessToken = token;
        return api(original);
      }
      const currentTokens = await tokenStorage.get();
      if (!currentTokens || currentTokens.accessToken === failedToken)
        onSessionExpired?.();
    }

    return Promise.reject(
      new ApiError(
        error.response?.data?.message ??
          (error.response
            ? error.message
            : 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.'),
        error.response?.data?.statusCode ?? error.response?.status ?? 0,
        error.response?.data?.errors,
      ),
    );
  },
);

export const unwrap = <T>(res: { data: ApiResponse<T> }) => res.data.data;
