import axios, { AxiosError, create as createAxios, InternalAxiosRequestConfig } from 'axios';

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

let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (fn: () => void) => {
  onSessionExpired = fn;
};

api.interceptors.request.use(async (config) => {
  const tokens = await tokenStorage.get();
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
    await tokenStorage.set(res.data.data);
    return res.data.data.accessToken;
  } catch {
    await tokenStorage.clear();
    return null;
  }
};

type Tokens = { accessToken: string; refreshToken: string };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ message?: string; statusCode?: number; errors?: Record<string, string[]> }>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthCall =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/verify-2fa');

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      refreshing ??= refreshAccessToken().finally(() => (refreshing = null));
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      onSessionExpired?.();
    }

    return Promise.reject(
      new ApiError(
        error.response?.data?.message ?? error.message ?? 'Lỗi kết nối',
        error.response?.data?.statusCode ?? error.response?.status ?? 0,
        error.response?.data?.errors,
      ),
    );
  },
);

export const unwrap = <T>(res: { data: ApiResponse<T> }) => res.data.data;
