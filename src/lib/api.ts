import axios, { create as createAxios } from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { tokenStorage } from './token-storage';

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

api.interceptors.request.use(async (config) => {
  if (
    config.url?.startsWith('/auth/') &&
    !['/auth/me', '/auth/logout', '/auth/change-password'].includes(config.url)
  )
    return config;
  const tokens = await tokenStorage.get();
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
let refreshing: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const tokens = await tokenStorage.get();
  if (!tokens) return null;
  try {
    const res = await axios.post<ApiResponse<Tokens>>(`${API_BASE_URL}/auth/refresh`, tokens);
    // Logout can finish while refresh is in flight; never restore that old session.
    if (!(await tokenStorage.replaceIfCurrent(tokens.refreshToken, res.data.data))) return null;
    return res.data.data.accessToken;
  } catch {
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
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    // These endpoints use 401 for wrong CAPTCHA/OTP, not just expired JWTs.
    const isAuthCall =
      (original?.url?.startsWith('/auth/') && original.url !== '/auth/me') ||
      original?.url?.startsWith('/settings/2fa');

    if (error.response?.status === 403 && original &&
      !original.url?.startsWith('/auth/') && !original.url?.startsWith('/settings/'))
      accessDeniedListeners.forEach((listener) => listener());

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      const requestAuthorization = original.headers.Authorization;
      original._retry = true;
      refreshing ??= refreshAccessToken().finally(() => (refreshing = null));
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      const currentTokens = await tokenStorage.get();
      if (!currentTokens || requestAuthorization === `Bearer ${currentTokens.accessToken}`)
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
