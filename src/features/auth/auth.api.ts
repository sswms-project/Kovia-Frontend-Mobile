import { api, unwrap, type ApiResponse } from '@/lib/api';

export type SignInResponse = {
  accessToken?: string;
  expiresIn: number;
  refreshToken?: string;
  requires2FA: boolean;
  tempToken?: string;
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<SignInResponse>>('/auth/login', { email, password }).then(unwrap),
  logout: () => api.post('/auth/logout'),
};
